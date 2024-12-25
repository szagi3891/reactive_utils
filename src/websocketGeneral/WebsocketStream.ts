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
    protocol: string,
    timeoutMs: number,
    log: boolean
): AsyncQuery<WebsocketStreamMessageReceived> => {
    const receivedMessage = new AsyncQuery<WebsocketStreamMessageReceived>();

    (async () => {
        while (receivedMessage.isOpen()) {
            const socket = await AsyncWebSocket.create(wsHost, protocol, timeoutMs, log);

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

            for await (const message of socket.subscribe()) {
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
        protocol: string,
        timeoutMs: number,
        log: boolean
    ) {
        this.sentMessage = new EventEmitter<WebsocketStreamMessageSend>();
        this.receivedMessage = createStream(this.sentMessage, wsHost, protocol, timeoutMs, log);
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

