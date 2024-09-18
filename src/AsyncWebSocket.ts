import { PromiseBox } from './PromiseBox';
import { AsyncQuery, AsyncQueryIterator } from "./AsyncQuery";
import { WebSocket } from 'unws';
import { AutoId } from "./AutoId";

const autoId = new AutoId();

export class AsyncWebSocket {
    private query: AsyncQuery<MessageEvent<unknown>>;

    private constructor(
        public readonly id: string,
        private readonly socket: WebSocket,
        private readonly log: boolean
    ) {
        this.query = new AsyncQuery<MessageEvent<unknown>>();
    }

    [Symbol.asyncIterator](): AsyncQueryIterator<MessageEvent<unknown>> {
        return this.query[Symbol.asyncIterator]();
    }

    public isClose(): boolean {
        return this.query.isClose();
    }

    public close() {
        if (this.log) {
            console.info(`AsyncWebSocket.close ${this.id}`);
        }

        this.query.close();
        this.socket.close();
    }

    public send = (data: string | BufferSource): void => {
        if (this.isClose()) {
            console.error(`AsyncWebSocket ${this.id}: - Ignore send message (socket is close)`, data);
        } else {
            if (this.log) {
                console.info(`AsyncWebSocket ${this.id}: SEND -> ${data}`);
            }
            this.socket.send(data);
        }
    }

    static create(host: string, timeout: number, log: boolean): Promise<AsyncWebSocket | null> {
        const result = new PromiseBox<AsyncWebSocket | null>();

        try {
            const id = autoId.get();
            console.info(`AsyncWebSocket ${id}: connect to ${host}`);

            const timeStart = new Date();
        
            const socket = new WebSocket(host);
            const inst = new AsyncWebSocket(id, socket, log);

            setTimeout(() => {
                if (result.isFulfilled()) {
                    return;
                }

                console.error(`AsyncWebSocket ${id}: Timeout connection for ${host}, timeout=${timeout}`);
                result.resolve(null);
                inst.close();
            }, timeout);

            socket.addEventListener('open', () => {
                const timeEnd = new Date();
                const timeOpening = timeEnd.getTime() - timeStart.getTime();
                console.info(`AsyncWebSocket ${id}: connected to ${host} in ${timeOpening}ms`);

                result.resolve(inst);
            });

            socket.addEventListener('message', (data) => {
                if (log) {
                    if (typeof data.data === 'string') {
                        console.info(`AsyncWebSocket ${id}: RECEIVED -> string -> ${data.data}`);
                    } else {
                        console.info(`AsyncWebSocket ${id}: RECEIVED -> ${typeof data.data}`);
                    }
                }
                inst.query.push(data);
            });

            socket.addEventListener('error', (data: Event) => {
                console.error(`AsyncWebSocket ${id}: Error connection for ${host}, error=${String(data)}`, data);
                result.resolve(null);
                inst.close();
            });

            socket.addEventListener('close', () => {
                if (result.isFulfilled() === false) {
                    console.error(`AsyncWebSocket ${id}: Close connection for ${host}`);
                    result.resolve(null);
                }
                inst.close();
            });
        } catch (err) {
            console.error(err);
            result.resolve(null);
        }

        return result.promise;
    }
}

