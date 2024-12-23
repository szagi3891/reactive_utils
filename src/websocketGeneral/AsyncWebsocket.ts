import { PromiseBoxOptimistic } from '../PromiseBox.ts';
import { AsyncQuery } from "../AsyncQuery.ts";
import type { AsyncQueryIterator } from "../AsyncQuery.ts";
import { WebSocket } from 'unws';
import { AutoId } from "../AutoId.ts";

const autoId = new AutoId();

class Log {
    private readonly id: string;

    public constructor(
        private readonly log: boolean,
    ) {
        this.id = autoId.get().toString();
    }

    info(message: string, ...data: unknown[]) {
        console.info(`AsyncWebSocket ${this.id}: ${message}`, ...data);
    }
    error(message: string, ...data: unknown[]) {
        console.error(`AsyncWebSocket ${this.id}: ${message}`, ...data);
    }

    warn(message: string, ...data: unknown[]) {
        console.warn(`AsyncWebSocket ${this.id}: ${message}`, ...data);
    }

    debug(message: string, ...data: unknown[]) {
        if (this.log) {
            console.info(`AsyncWebSocket ${this.id}: ${message}`, ...data);
        }
    }
}

export class AsyncWebSocket {
    public onAbort: (callback: () => void) => (() => void);

    private constructor(
        private log: Log,
        private readonly query: AsyncQuery<string>,
        private readonly sendFn: (data: string | BufferSource) => void,
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
        return this.query.isClose();
    }

    public close() {
        this.log.debug('close');
        this.query.close();
    }

    public send = (data: string | BufferSource): void => {
        if (this.isClose()) {
            this.log.warn(`Ignore send message (socket is close)`, data);
        } else {
            this.log.debug('SEND ->', data);
            this.sendFn(data);
        }
    }

    static forTest(showDebugLog: boolean, onReceived: (message: string | BufferSource) => void): {
        send: (data: string) => void,
        socket: AsyncWebSocket,
    } {
        const log = new Log(showDebugLog);
        const query = new AsyncQuery<string>(); 

        const returnInst = new AsyncWebSocket(
            log,
            query,
            (data: string | BufferSource) => {
                onReceived(data);
            },
        );

        return {
            send: (data: string) => {
                query.push(data);
            },
            socket: returnInst
        };
    }

    static fromWebSocket(socket: WebSocket, showDebugLog: boolean): AsyncWebSocket {
        const log = new Log(showDebugLog);

        const query = new AsyncQuery<string>();

        socket.addEventListener('message', (data) => {
            if (typeof data.data === 'string') {
                log.debug(`RECEIVED -> string -> ${data.data}`);
                query.push(data.data);
                return;
            }

            log.error(`RECEIVED -> unsupported message type -> ${typeof data.data}`);
        });

        const returnInst = new AsyncWebSocket(
            log,
            query,
            (data: string | BufferSource) => {
                socket.send(data);
            },
        );

        return returnInst;
    }

    static create(host: string, timeout: number, showDebugLog: boolean): Promise<AsyncWebSocket> {
        const result = new PromiseBoxOptimistic<AsyncWebSocket>();
        const log = new Log(showDebugLog);
        log.info(`connect to ${host}`);

        const timeStart = new Date();
        const socket = new WebSocket(host);
        const query = new AsyncQuery<string>();

        query.onAbort(() => {
            socket.close();
        });

        const returnInst = new AsyncWebSocket(
            log,
            query,
            (data: string | BufferSource) => {
                socket.send(data);
            },
        );

        setTimeout(() => {
            if (result.isFulfilled()) {
                return;
            }

            log.error(`Timeout connection for ${host}, timeout=${timeout}`);
            result.resolve(returnInst);
            query.close();
        }, timeout);

        socket.addEventListener('open', () => {
            const timeEnd = new Date();
            const timeOpening = timeEnd.getTime() - timeStart.getTime();
            log.info(`connected to ${host} in ${timeOpening}ms`);

            result.resolve(returnInst);
        });

        socket.addEventListener('message', (data) => {
            if (typeof data.data === 'string') {
                log.debug(`RECEIVED -> string -> ${data.data}`);
                query.push(data.data);
                return;
            }

            log.error(`RECEIVED -> unsupported message type -> ${typeof data.data}`);
        });

        socket.addEventListener('error', (data: Event) => {
            log.error(`Error connection for ${host}, error=${String(data)}`, data);
            result.resolve(returnInst);
            query.close();
        });

        socket.addEventListener('close', () => {
            if (result.isFulfilled() === false) {
                log.error(`Close connection for ${host}`);
                result.resolve(returnInst);
            }
            query.close();
        });

        return result.promise;
    }
}

//TODO - konstruktor statyczny, tworzenie strumienia z gotowego obiektu WebSoocket

/*
    interfejs strumienia (socket ?)

        subscribe(): AsyncQueryIterator<string> {
        }

        public close() {
        }

        public send = (data: string | BufferSource): void => {
        }
*/
