import { PromiseBoxOptimistic } from '../PromiseBox.ts';
import { AsyncQuery } from "../AsyncQuery.ts";
import type { AsyncQueryIterator } from "../AsyncQuery.ts";
import { WebSocket } from 'unws';
import { AutoId } from "../AutoId.ts";

const autoId = new AutoId();

export class AsyncWebSocket {
    public onAbort: (callback: () => void) => (() => void);

    private constructor(
        public readonly id: string,
        private readonly query: AsyncQuery<string>,
        private readonly log: boolean
    ) {
        this.onAbort = this.query.onAbort;
    }

    subscribe(): AsyncQueryIterator<string> {
        return this.query.subscribe();
    }

    [Symbol.dispose]() {
        this.close();
    }

    
    public isClose(): boolean {
        return this.isClose();
    }

    public close() {
        if (this.log) {
            console.info(`AsyncWebSocket ${this.id}: close`);
        }

        this.close();
    }

    public send = (data: string | BufferSource): void => {
        if (this.isClose()) {
            console.error(`AsyncWebSocket ${this.id}: Ignore send message (socket is close)`, data);
        } else {
            if (this.log) {
                console.info(`AsyncWebSocket ${this.id}: SEND -> ${data}`);
            }

            this.send(data);
        }
    }

    static create(host: string, timeout: number, log: boolean): Promise<AsyncWebSocket> {
        const result = new PromiseBoxOptimistic<AsyncWebSocket>();
        const id = autoId.get().toString();

        console.info(`AsyncWebSocket ${id}: connect to ${host}`);

        const timeStart = new Date();
    
        const socket = new WebSocket(host);

        const query = new AsyncQuery<string>();

        query.onAbort(() => {
            socket.close();
        });

        const returnInst = new AsyncWebSocket(id, query, log);

        setTimeout(() => {
            if (result.isFulfilled()) {
                return;
            }

            console.error(`AsyncWebSocket ${id}: Timeout connection for ${host}, timeout=${timeout}`);
            result.resolve(returnInst);
            query.close();
        }, timeout);

        socket.addEventListener('open', () => {
            const timeEnd = new Date();
            const timeOpening = timeEnd.getTime() - timeStart.getTime();
            console.info(`AsyncWebSocket ${id}: connected to ${host} in ${timeOpening}ms`);

            result.resolve(returnInst);
        });

        socket.addEventListener('message', (data) => {
            if (typeof data.data === 'string') {
                if (log) {
                    console.info(`AsyncWebSocket ${id}: RECEIVED -> string -> ${data.data}`);
                }
                query.push(data.data);
                return;
            }

            console.error(`AsyncWebSocket ${id}: RECEIVED -> unsupported message type -> ${typeof data.data}`);
        });

        socket.addEventListener('error', (data: Event) => {
            console.error(`AsyncWebSocket ${id}: Error connection for ${host}, error=${String(data)}`, data);
            result.resolve(returnInst);
            query.close();
        });

        socket.addEventListener('close', () => {
            if (result.isFulfilled() === false) {
                console.error(`AsyncWebSocket ${id}: Close connection for ${host}`);
                result.resolve(returnInst);
            }
            query.close();
        });

        return result.promise;
    }
}

