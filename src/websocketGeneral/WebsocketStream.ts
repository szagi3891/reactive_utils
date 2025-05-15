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

const createStream = (
    sentMessage: EventEmitter<WebsocketStreamMessageSend>,
    wsHost: string,
    getProtocol: () => string | null,
    timeoutMs: number,
    timeoutIdleMs: number | null,
    log: boolean
): AsyncQuery<WebsocketStreamMessageReceived> => {
    const receivedMessage = new AsyncQuery<WebsocketStreamMessageReceived>();

    (async () => {
        while (receivedMessage.isOpen()) {
            const socket = await AsyncWebSocket.create(wsHost, getProtocol(), timeoutMs, log);

            const unsubscribe = receivedMessage.onAbort(() => {
                socket.close();
            });

            const sentUnsubscribe = sentMessage.on((message) => {
                if (socket.isClose() === false) {
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
                }
            });

            socket.onAbort(() => {
                unsubscribe();
                sentUnsubscribe();
            });

            receivedMessage.push({
                type: 'connected'
            });

            let timer: number | null = null;
            const resetTimerIdle = () => {
                if (timeoutIdleMs === null) {
                    return;
                }

                if (timer !== null) {
                    clearTimeout(timer);
                }

                timer = setTimeout(() => {
                    socket.close();
                }, timeoutIdleMs);
            };

            resetTimerIdle();

            for await (const message of socket.subscribe()) {
                resetTimerIdle();

                timer = setTimeout(() => {
                    socket.close();
                }, 30_000);

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
        timeoutMs: number,
        timeoutIdleMs: number | null,
        log: boolean
    ) {
        this.sentMessage = new EventEmitter<WebsocketStreamMessageSend>();
        this.receivedMessage = createStream(this.sentMessage, wsHost, getProtocol, timeoutMs, timeoutIdleMs, log);
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

