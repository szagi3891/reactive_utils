import { timeout } from "../../timeout.ts";
import { AsyncQuery, AsyncQueryIterator } from "../../AsyncQuery.ts";
import { EventEmitter } from "../../EventEmitter.ts";
import { AsyncWebSocket } from "../../AsyncWebSocket.ts";

type Message = {
    type: 'message',
    value: string | BufferSource
} | {
    type: 'reconnect',
};

const createStream = (
    sentMessage: EventEmitter<Message>,
    wsHost: string,
    timeoutMs: number,
    log: boolean
): AsyncQuery<MessageEvent<unknown> | 'connected' | 'disconnected'> => {
    const receivedMessage = new AsyncQuery<MessageEvent<unknown> | 'connected' | 'disconnected'>();

    (async () => {
        while (receivedMessage.isOpen()) {
            const socket = await AsyncWebSocket.create(wsHost, timeoutMs, log);

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

            receivedMessage.push('connected');

            for await (const message of socket.subscribe()) {
                receivedMessage.push(message);
            }

            receivedMessage.push('disconnected');

            console.info('disconnect, waiting ...');
            await timeout(1000);
        }
    })();

    return receivedMessage;
};

export class WebsocketStream {
    private readonly sentMessage: EventEmitter<Message>;
    private readonly receivedMessage: AsyncQuery<MessageEvent<unknown> | 'connected' | 'disconnected'>;

    constructor(
        wsHost: string,
        timeoutMs: number,
        log: boolean
    ) {
        this.sentMessage = new EventEmitter<Message>();
        this.receivedMessage = createStream(this.sentMessage, wsHost, timeoutMs, log);
    }

    public send(data: string | BufferSource): void {
        this.sentMessage.trigger({
            type: 'message',
            value: data
        });
    }

    public messages(): AsyncQueryIterator<MessageEvent<unknown> | 'connected' | 'disconnected'> {
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

