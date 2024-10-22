import { PromiseBox, PromiseBoxOptimistic } from './PromiseBox.ts';
import { AsyncQuery, AsyncQueryIterator } from "./AsyncQuery.ts";
import { WebSocket } from 'unws';
import { AutoId } from "./AutoId.ts";

const autoId = new AutoId();

class SocketStream {
    constructor(
        // public readonly socket: WebSocket,
        public readonly query: AsyncQuery<MessageEvent<unknown>>,
        public readonly onClose: () => void,
        public readonly send: (data: string | BufferSource) => void
    ) {}

    close() {
        this.query.close();
        // this.socket.close();
        this.onClose();
    }

    public isClose(): boolean {
        return this.query.isClose();
    }
}

export class AsyncWebSocket {
    private constructor(
        public readonly id: string,
        private readonly stream: SocketStream,
        private readonly log: boolean
    ) {
    }

    [Symbol.asyncIterator](): AsyncQueryIterator<MessageEvent<unknown>> {
        return this.stream.query[Symbol.asyncIterator]();
    }

    [Symbol.dispose]() {
        this.stream.close();
    }

    public isClose(): boolean {
        return this.stream.isClose();
    }

    public close() {
        if (this.log) {
            console.info(`AsyncWebSocket.close ${this.id}`);
        }

        this.stream.close();
    }

    public send = (data: string | BufferSource): void => {
        if (this.isClose()) {
            console.error(`AsyncWebSocket ${this.id}: - Ignore send message (socket is close)`, data);
        } else {
            if (this.log) {
                console.info(`AsyncWebSocket ${this.id}: SEND -> ${data}`);
            }

            this.stream.send(data);
        }
    }

    static create(host: string, timeout: number, log: boolean): Promise<AsyncWebSocket> {
        const result = new PromiseBoxOptimistic<AsyncWebSocket>();
        const id = autoId.get();

        try {
            console.info(`AsyncWebSocket ${id}: connect to ${host}`);

            const timeStart = new Date();
        
            const socket = new WebSocket(host);

            const stream = new SocketStream(
                new AsyncQuery(),
                () => {
                    socket.close();
                },
                (data: string | BufferSource): void => {
                    socket.send(data);
                }
            );

            const returnInst = new AsyncWebSocket(id, stream, log);

            setTimeout(() => {
                if (result.isFulfilled()) {
                    return;
                }

                console.error(`AsyncWebSocket ${id}: Timeout connection for ${host}, timeout=${timeout}`);
                result.resolve(returnInst);
                stream.close();
            }, timeout);

            socket.addEventListener('open', () => {
                const timeEnd = new Date();
                const timeOpening = timeEnd.getTime() - timeStart.getTime();
                console.info(`AsyncWebSocket ${id}: connected to ${host} in ${timeOpening}ms`);

                result.resolve(returnInst);
            });

            socket.addEventListener('message', (data) => {
                if (log) {
                    if (typeof data.data === 'string') {
                        console.info(`AsyncWebSocket ${id}: RECEIVED -> string -> ${data.data}`);
                    } else {
                        console.info(`AsyncWebSocket ${id}: RECEIVED -> ${typeof data.data}`);
                    }
                }
                stream.query.push(data);
            });

            socket.addEventListener('error', (data: Event) => {
                console.error(`AsyncWebSocket ${id}: Error connection for ${host}, error=${String(data)}`, data);
                result.resolve(returnInst);
                stream.close();
            });

            socket.addEventListener('close', () => {
                if (result.isFulfilled() === false) {
                    console.error(`AsyncWebSocket ${id}: Close connection for ${host}`);
                    result.resolve(returnInst);
                }
                stream.close();
            });
        } catch (err) {
            console.error(err);

            const stream = new SocketStream(
                new AsyncQuery(),
                () => {},
                (_data: string | BufferSource): void => {}
            );

            stream.close();
            result.resolve(new AsyncWebSocket(id, stream, log));
        }

        return result.promise;
    }
}

