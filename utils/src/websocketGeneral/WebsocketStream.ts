import { Stream } from "../Stream.ts";
import { EventEmitter } from "../EventEmitter.ts";
import { AsyncWebSocket } from "./AsyncWebsocket.ts";
import { addEventOffline } from "./WebsocketStream/offline.ts";
import { OnlineSemafor } from "./WebsocketStream/onlineSemafor.ts";
import { timeoutSemafor } from "./WebsocketStream/timeout.ts";
import { CheckByZod } from "../checkByZod.ts";


export type WebsocketStreamMessageReceived<ReceiveT, SendT> = {
    type: 'message',
    data: ReceiveT,
} | {
    type: 'offline'
} | {
    type: 'connecting',
} | {
    type: 'connected',
    send: (data: SendT) => void,
    reconnect: () => void,
} | {
    type: 'disconnected',
}

export type WebsocketStreamMessageSend<SendT> = {
    type: 'message',
    value: SendT
} | {
    type: 'reconnect',
};

export interface PingPongParamsType {
    timeoutPingMs: number,
    timeoutCloseMs: number,
    formatPingMessage: () => string,
}

class PingPongManager<ReceiveT, SendT> {
    lastActionTime: number;
    lastAction: 'ping' | 'message' = 'message';

    constructor(socket: AsyncWebSocket<ReceiveT, SendT>, config: PingPongParamsType, showLog: boolean) {
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
                        //@ts-expect-error - Ping message type mismatch with SendT is intentional 
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

const initEvents = <ReceiveT, SendT>(
    receivedMessage: Stream<WebsocketStreamMessageReceived<ReceiveT, SendT>>,
    sentMessage: EventEmitter<WebsocketStreamMessageSend<SendT>>,
    socket: AsyncWebSocket<ReceiveT, SendT>
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

const createStream = <ReceiveT, SendT>(
    sentMessage: EventEmitter<WebsocketStreamMessageSend<SendT>>,
    wsHost: string,
    connectionTimeoutMs: number,
    reconnectTimeoutMs: number,
    pingPong: PingPongParamsType | null,
    log: boolean,
    signal: AbortSignal,
    receiveValidator: CheckByZod<ReceiveT>,
    sendValidator: CheckByZod<SendT>,
): AsyncIterable<WebsocketStreamMessageReceived<ReceiveT, SendT>> => {
    const receivedMessage = new Stream<WebsocketStreamMessageReceived<ReceiveT, SendT>>();
    
    signal.addEventListener('abort', () => {
        receivedMessage.close();
    }, { once: true });

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

                const socket = await AsyncWebSocket.create<ReceiveT, SendT>({
                    host: wsHost, 
                    protocol: null, 
                    timeout: connectionTimeoutMs, 
                    showDebugLog: log,
                    receiveValidator,
                    sendValidator
                });

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
                    send: (data: SendT) => {
                        socket.send(data);
                    },
                    reconnect: () => {
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

    return receivedMessage.readable;
};

export class WebsocketStream<ReceiveT, SendT> {
    private readonly sentMessage: EventEmitter<WebsocketStreamMessageSend<SendT>>;
    private readonly receivedMessage: AsyncIterable<WebsocketStreamMessageReceived<ReceiveT, SendT>>;
    private readonly abortController: AbortController;

    constructor(
        wsHost: string,
        connectionTimeoutMs: number,
        reconnectTimeoutMs: number,
        pingPong: PingPongParamsType | null,
        log: boolean,
        receiveValidator: CheckByZod<ReceiveT>,
        sendValidator: CheckByZod<SendT>,
    ) {
        this.sentMessage = new EventEmitter<WebsocketStreamMessageSend<SendT>>;
        this.abortController = new AbortController();
        this.receivedMessage = createStream(
            this.sentMessage,
            wsHost,
            connectionTimeoutMs,
            reconnectTimeoutMs,
            pingPong,
            log,
            this.abortController.signal,
            receiveValidator,
            sendValidator,
        );
    }

    public send(data: SendT): void {
        this.sentMessage.trigger({
            type: 'message',
            value: data
        });
    }

    public messages(): AsyncIterable<WebsocketStreamMessageReceived<ReceiveT, SendT>> {
        return this.receivedMessage;
    }

    public close(): void {
        this.abortController.abort();
    }

    public reconnect(): void {
        this.sentMessage.trigger({
            type: 'reconnect',
        });
    }
}
