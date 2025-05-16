import { timeout } from "../timeout.ts";
import { AsyncQuery, AsyncQueryIterator } from "../AsyncQuery.ts";
import { EventEmitter } from "../EventEmitter.ts";
import { AsyncWebSocket } from "./AsyncWebsocket.ts";

export type WebsocketStreamMessageReceived = {
    type: 'message',
    data: string,
} | {
    type: 'connected',
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

    constructor(socket: AsyncWebSocket, config: PingPongParamsType) {
        this.lastActionTime = new Date().getTime();
        
        if (config.timeoutPingMs < config.timeoutCloseMs) {
            //ok
        } else {
            console.error('timeoutCloseMs must be greater than timeoutPingMs');
            return;
        }
    
        const timerInterval = setInterval(() => {
            const timeElapsed = new Date().getTime() - this.lastActionTime;

            switch (this.lastAction) {
                case 'message': {
                    if (timeElapsed > config.timeoutPingMs) {
                        this.lastAction = 'ping';
                        socket.send(config.formatPingMessage());
                        return;
                    }
                    return;
                }
                case 'ping': {
                    if (timeElapsed > config.timeoutCloseMs) {
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

const createStream = (
    sentMessage: EventEmitter<WebsocketStreamMessageSend>,
    wsHost: string,
    getProtocol: () => string | null,
    connectionTimeoutMs: number,
    pingPong: PingPongParamsType | null,
    log: boolean
): AsyncQuery<WebsocketStreamMessageReceived> => {
    const receivedMessage = new AsyncQuery<WebsocketStreamMessageReceived>();

    (async () => {
        while (receivedMessage.isOpen()) {
            const socket = await AsyncWebSocket.create(wsHost, getProtocol(), connectionTimeoutMs, log);

            const unsubscribe = receivedMessage.onAbort(() => {
                socket.close();
            });

            const sentUnsubscribe = sentMessage.on((message) => {
                if (socket.isClose() === false) {
                    return;
                }

                if (message.type === 'message') {
                    socket.send(message.value);
                    return;
                }
                if (message.type === 'reconnect') {
                    console.info('reconnect ...');
                    socket.close();
                    return;
                }

                return assertNever(message);
            });

            socket.onAbort(() => {
                unsubscribe();
                sentUnsubscribe();
            });

            receivedMessage.push({
                type: 'connected'
            });

            const pingPongManager = pingPong === null ? null : new PingPongManager(socket, pingPong);

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
            await timeout(1000);
        }
    })();

    return receivedMessage;
};

export class WebsocketStream {
    private readonly sentMessage: EventEmitter<WebsocketStreamMessageSend>;
    private readonly receivedMessage: AsyncQuery<WebsocketStreamMessageReceived>;

    constructor(
        wsHost: string,
        getProtocol: () => string | null,
        connectionTimeoutMs: number,
        pingPong: PingPongParamsType | null,
        log: boolean
    ) {
        this.sentMessage = new EventEmitter<WebsocketStreamMessageSend>();
        this.receivedMessage = createStream(this.sentMessage, wsHost, getProtocol, connectionTimeoutMs, pingPong, log);
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

function assertNever(_message: never): void {
    throw new Error("Function not implemented.");
}

