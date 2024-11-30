import { timeout } from "../../timeout.ts";
import { AsyncQuery, AsyncQueryIterator } from "../../AsyncQuery.ts";
import { EventEmitter } from "../../EventEmitter.ts";
import { AsyncWebSocket } from "../../AsyncWebSocket.ts";

const createStream = (
    sentMessage: EventEmitter<string | BufferSource>,
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

            const sentUnsubscribe = sentMessage.on((messageSent) => {
                if (socket.isClose() === false) {
                    socket.send(messageSent);
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
    private readonly sentMessage: EventEmitter<string | BufferSource>;
    private readonly receivedMessage: AsyncQuery<MessageEvent<unknown> | 'connected' | 'disconnected'>;

    constructor(
        wsHost: string,
        timeoutMs: number,
        log: boolean
    ) {
        this.sentMessage = new EventEmitter<string | BufferSource>();
        this.receivedMessage = createStream(this.sentMessage, wsHost, timeoutMs, log);
    }

    public send(data: string | BufferSource): void {
        this.sentMessage.trigger(data);
    }

    public messages(): AsyncQueryIterator<MessageEvent<unknown> | 'connected' | 'disconnected'> {
        return this.receivedMessage.subscribe();
    }

    public close(): void {
        this.receivedMessage.close();
    }
}

