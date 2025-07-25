import { PromiseBoxOptimistic } from '../PromiseBox.ts';
import { AsyncQuery } from "../AsyncQuery.ts";
import type { AsyncQueryIterator } from "../AsyncQuery.ts";
import { AutoId } from "../AutoId.ts";

export interface AsyncWebSocketType {
    addEventListener : WebSocket['addEventListener'],
    close: WebSocket['close'],
    url: WebSocket['url'],
    send: WebSocket['send'],
    protocol: WebSocket['protocol'],
}

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

const setupHanlders = (
    log: Log,
    socket: AsyncWebSocketType,
    query: AsyncQuery<string>,
    whenClose?: () => void,
) => {
    query.onAbort(() => {
        socket.close();
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
        log.error(`Error connection for ${socket.url}, error=${String(data)}`, data);
        query.close();
        whenClose?.();
    });

    socket.addEventListener('close', () => {
        log.debug(`Close connection for ${socket.url}`);
        query.close();
        whenClose?.();
    });
}

export class AsyncWebSocket {
    public onAbort: (callback: () => void) => (() => void);

    private constructor(
        private log: Log,
        private readonly query: AsyncQuery<string>,
        private readonly sendFn: (data: string | BufferSource) => void,
        public readonly protocol: string | null,
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

    static custom(
        showDebugLog: boolean,
        protocol: string,
        onReceived: (message: string | BufferSource) => void,
    ): {
        send: (data: string) => void,
        socket: AsyncWebSocket,
    } {
        const log = new Log(showDebugLog);
        const query = new AsyncQuery<string>();

        return {
            send: (data: string) => {
                query.push(data);
            },
            socket: new AsyncWebSocket(
                log,
                query,
                (data: string | BufferSource) => {
                    onReceived(data);
                },
                protocol,
            )
        };
    }

    static fromWebSocket(socket: AsyncWebSocketType, showDebugLog: boolean): AsyncWebSocket {
        const log = new Log(showDebugLog);
        const query = new AsyncQuery<string>();

        setupHanlders(
            log,
            socket,
            query,
        );

        return new AsyncWebSocket(
            log,
            query,
            (data: string | BufferSource) => {
                socket.send(data);
            },
            socket.protocol,
        );
    }

    private static createWebsocket(host: string, protocol: string | null): WebSocket | null {
        try {
            return new WebSocket(host, protocol ?? undefined);
        } catch (_error: unknown) {
            return null;
        }
    }

    static async create(
        host: string,
        protocol: string | null,
        timeout: number,
        showDebugLog: boolean
    ): Promise<AsyncWebSocket | null> {
        const result = new PromiseBoxOptimistic<AsyncWebSocket | null>();
        const log = new Log(showDebugLog);
        log.info(`connect to host=${host}, protocol=${protocol}, timeout=${timeout}`);

        const timeStart = new Date();
        const socket = AsyncWebSocket.createWebsocket(host, protocol);
        if (socket === null) {
            return null;
        }

        const query = new AsyncQuery<string>();

        const returnInst = new AsyncWebSocket(
            log,
            query,
            (data: string | BufferSource) => {
                socket.send(data);
            },
            protocol,
        );

        setTimeout(() => {
            if (result.isFulfilled()) {
                return;
            }

            log.error(`Timeout connection for ${host}, timeout=${timeout}`);
            result.resolve(null);
            query.close();
        }, timeout);

        socket.addEventListener('open', () => {
            const timeEnd = new Date();
            const timeOpening = timeEnd.getTime() - timeStart.getTime();
            log.info(`connected to ${host} in ${timeOpening}ms`);

            result.resolve(returnInst);
        });

        setupHanlders(
            log,
            socket,
            query,
            () => {
                result.resolve(null);
                query.close();
            }
        );

        const response = await result.promise;
        return response;
    }
}
