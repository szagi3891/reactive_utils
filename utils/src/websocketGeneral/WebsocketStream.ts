import { AsyncQuery, AsyncQueryIterator } from "../AsyncQuery.ts";
import { EventEmitter } from "../EventEmitter.ts";
import { AsyncWebSocket } from "./AsyncWebsocket.ts";
import { addEventOffline } from "./WebsocketStream/offline.ts";
import { OnlineSemafor } from "./WebsocketStream/onlineSemafor.ts";
import { timeoutSemafor } from "./WebsocketStream/timeout.ts";

export type WebsocketStreamMessageReceived = {
    type: 'message',
    data: string,
} | {
    type: 'offline'
} | {
    type: 'connecting',
} | {
    type: 'connected',
    send: (data: string) => void,
    close: () => void,
} | {
    type: 'disconnected',
}

export type WebsocketStreamMessageSend = {
    type: 'message',
    value: string | BufferSource
} | {
    type: 'reconnect',
};

interface PingPongParamsType {
    timeoutPingMs: number,
    timeoutCloseMs: number,
    formatPingMessage: () => string,
}

class PingPongManager {
    lastActionTime: number;
    lastAction: 'ping' | 'message' = 'message';

    constructor(socket: AsyncWebSocket, config: PingPongParamsType, showLog: boolean) {
        this.lastActionTime = new Date().getTime();
        
        if (config.timeoutPingMs < config.timeoutCloseMs) {
            //ok
        } else {
            console.error('timeoutCloseMs must be greater than timeoutPingMs');
            return;
        }
    
        if (showLog) {
            console.info('WebsocketStream - PingPongManager: start timer');
        }

        const timerInterval = setInterval(() => {
            const timeElapsed = new Date().getTime() - this.lastActionTime;

            if (showLog) {
                console.info('WebsocketStream - PingPongManager: timeElapsed ...', timeElapsed);
            }

            switch (this.lastAction) {
                case 'message': {
                    if (timeElapsed > config.timeoutPingMs) {
                        if (showLog) {
                            console.info('WebsocketStream - PingPongManager: send ping')
                        }
                        this.lastAction = 'ping';
                        socket.send(config.formatPingMessage());
                        return;
                    }
                    return;
                }
                case 'ping': {
                    if (timeElapsed > config.timeoutCloseMs) {
                        if (showLog) {
                            console.info('WebsocketStream: close')
                        }
                        socket.close();
                    }
                }
            }
        }, 1_000);

        socket.onAbort(() => {
            clearInterval(timerInterval);
        });
    }

    reciveMessage() {
        this.lastAction = 'message';
        this.lastActionTime = new Date().getTime();
    }
};

const initEvents = (
    receivedMessage: AsyncQuery<WebsocketStreamMessageReceived>,
    sentMessage: EventEmitter<WebsocketStreamMessageSend>,
    socket: AsyncWebSocket
) => {

    const unsubscribe = receivedMessage.onAbort(() => {
        socket.close();
    });

    const sentUnsubscribe = sentMessage.on((message) => {
        if (socket.isClose()) {
            return;
        }

        switch (message.type) {
            case 'message': {
                socket.send(message.value);
                return;
            }
            case 'reconnect': {
                console.info('reconnect ...');
                socket.close();
            }
        }
    });

    const unsubscribeNeetworkOffline = addEventOffline(() => {
        socket.close();
    });

    socket.onAbort(() => {
        unsubscribe();
        sentUnsubscribe();
        unsubscribeNeetworkOffline();
    });
};

const createStream = (
    sentMessage: EventEmitter<WebsocketStreamMessageSend>,
    wsHost: string,
    getProtocol: () => string | null,
    connectionTimeoutMs: number,
    reconnectTimeoutMs: number,
    pingPong: PingPongParamsType | null,
    log: boolean
): AsyncQuery<WebsocketStreamMessageReceived> => {
    const receivedMessage = new AsyncQuery<WebsocketStreamMessageReceived>();

    (async () => {
        const onlineSemafor = new OnlineSemafor();

        try {
            while (receivedMessage.isOpen()) {
                receivedMessage.push({
                    type: 'offline'
                });

                await onlineSemafor.waitFor(true);

                receivedMessage.push({
                    type: 'connecting'
                });

                const socket = await AsyncWebSocket.create(wsHost, getProtocol(), connectionTimeoutMs, log);

                if (socket === null) {
                    receivedMessage.push({
                        type: 'disconnected'
                    });
                    console.info('AsyncWebSocket.create fail ...');
                    await timeoutSemafor(onlineSemafor, reconnectTimeoutMs);
                    continue;
                }

                initEvents(
                    receivedMessage,
                    sentMessage,
                    socket
                );

                receivedMessage.push({
                    type: 'connected',
                    send: (data: string) => {
                        socket.send(data);
                    },
                    close: () => {
                        socket.close();
                    },
                });

                const pingPongManager = pingPong === null ? null : new PingPongManager(socket, pingPong, log);

                for await (const message of socket.subscribe()) {
                    pingPongManager?.reciveMessage();

                    receivedMessage.push({
                        type: 'message',
                        data: message
                    });
                }

                receivedMessage.push({
                    type: 'disconnected'
                });

                console.info('disconnect, waiting ...');
                await timeoutSemafor(onlineSemafor, reconnectTimeoutMs);
            }
        } finally {
            onlineSemafor.dispose();
        }

    })().catch((error: unknown) => {
        console.error(error);
    });

    return receivedMessage;
};

export class WebsocketStream {
    private readonly sentMessage: EventEmitter<WebsocketStreamMessageSend>;
    private readonly receivedMessage: AsyncQuery<WebsocketStreamMessageReceived>;

    constructor(
        wsHost: string,
        getProtocol: () => string | null,
        connectionTimeoutMs: number,
        reconnectTimeoutMs: number,
        pingPong: PingPongParamsType | null,
        log: boolean
    ) {
        this.sentMessage = new EventEmitter<WebsocketStreamMessageSend>();
        this.receivedMessage = createStream(this.sentMessage, wsHost, getProtocol, connectionTimeoutMs, reconnectTimeoutMs, pingPong, log);
    }

    public send(data: string | BufferSource): void {
        this.sentMessage.trigger({
            type: 'message',
            value: data
        });
    }

    public messages(): AsyncQueryIterator<WebsocketStreamMessageReceived> {
        return this.receivedMessage.subscribe();
    }

    public close(): void {
        this.receivedMessage.close();
    }

    public reconnect(): void {
        this.sentMessage.trigger({
            type: 'reconnect',
        });
    }
}
