import { timeout } from "../../timeout.ts";
import { AsyncQuery, AsyncQueryIterator } from "../../AsyncQuery.ts";
import { EventEmitter } from "../../EventEmitter.ts";
import { AsyncWebSocket } from "../../AsyncWebSocket.ts";

const createStream = (
    sentMessage: EventEmitter<string | BufferSource>,
    wsHost: string,
    timeoutMs: number,
    log: boolean
): AsyncQuery<MessageEvent<unknown> | null> => {
    const receivedMessage = new AsyncQuery<MessageEvent<unknown> | null>();

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

            receivedMessage.push(null); //informuje, że jest nawiązane nowe połaczenie

            for await (const message of socket.subscribe()) {
                receivedMessage.push(message);
            }

            console.info('disconnect, waiting ...');
            await timeout(1000);
        }
    })();

    return receivedMessage;
};

export class WebsocketStream {
    private readonly sentMessage: EventEmitter<string | BufferSource>;
    private readonly receivedMessage: AsyncQuery<MessageEvent<unknown> | null>;

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

    public messages(): AsyncQueryIterator<MessageEvent<unknown> | null> {
        return this.receivedMessage.subscribe();
    }

    public close(): void {
        this.receivedMessage.close();
    }
}

