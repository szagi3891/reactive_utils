import { PromiseBoxOptimistic } from '../PromiseBox.ts';
import { Stream } from "../Stream.ts";

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
    stream: Stream<string>,
    whenClose?: () => void,
) => {
    stream.onAbort(() => {
        socket.close();
    });

    socket.addEventListener('message', (data) => {
        if (typeof data.data === 'string') {
            log.debug(`RECEIVED -> string -> ${data.data}`);
            stream.push(data.data);
            return;
        }

        log.error(`RECEIVED -> unsupported message type -> ${typeof data.data}`);
    });

    socket.addEventListener('error', (data: Event) => {
        log.error(`Error connection for ${socket.url}, error=${String(data)}`, data);
        stream.close();
        whenClose?.();
    });

    socket.addEventListener('close', () => {
        log.debug(`Close connection for ${socket.url}`);
        stream.close();
        whenClose?.();
    });
}

export class AsyncWebSocket {
    public onAbort: (callback: () => void) => (() => void);

    private constructor(
        private log: Log,
        private readonly stream: Stream<string>,
        private readonly sendFn: (data: string | BufferSource) => void,
        public readonly protocol: string | null,
    ) {
        this.onAbort = this.stream.onAbort;
    }

    subscribe(): AsyncIterable<string> {
        return this.stream.readable;
    }

    [Symbol.dispose]() {
        this.close();
    }

    public isClose(): boolean {
        return !this.stream.isOpen();
    }

    public close() {
        this.log.debug('close');
        this.stream.close();
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
        const stream = new Stream<string>();

        return {
            send: (data: string) => {
                stream.push(data);
            },
            socket: new AsyncWebSocket(
                log,
                stream,
                (data: string | BufferSource) => {
                    onReceived(data);
                },
                protocol,
            )
        };
    }

    static fromWebSocket(socket: AsyncWebSocketType, showDebugLog: boolean): AsyncWebSocket {
        const log = new Log(showDebugLog);
        const stream = new Stream<string>();

        setupHanlders(
            log,
            socket,
            stream,
        );

        return new AsyncWebSocket(
            log,
            stream,
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

        const stream = new Stream<string>();

        const returnInst = new AsyncWebSocket(
            log,
            stream,
            (data: string | BufferSource) => {
                socket.send(data);
            },
            protocol,
        );

        let timerId: number | undefined = undefined;

        const clearTimer = () => {
             if (timerId !== undefined) {
                 clearTimeout(timerId);
                 timerId = undefined;
             }
        };

        timerId = setTimeout(() => {
            if (result.isFulfilled()) {
                return;
            }

            log.error(`Timeout connection for ${host}, timeout=${timeout}`);
            result.resolve(null);
            stream.close();
        }, timeout);

        socket.addEventListener('open', () => {
            clearTimer();
            const timeEnd = new Date();
            const timeOpening = timeEnd.getTime() - timeStart.getTime();
            log.info(`connected to ${host} in ${timeOpening}ms`);

            result.resolve(returnInst);
        });

        setupHanlders(
            log,
            socket,
            stream,
            () => {
                clearTimer();
                result.resolve(null);
                stream.close();
            }
        );

        const response = await result.promise;
        return response;
    }
}
