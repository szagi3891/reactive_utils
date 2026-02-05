import { PromiseBoxOptimistic } from '../PromiseBox.ts';
import { Stream } from "../Stream.ts";
import { CheckByZod } from "../checkByZod.ts";

import { AutoId } from "../AutoId.ts";

// export interface AsyncWebSocketType {
//     addEventListener : WebSocket['addEventListener'],
//     close: WebSocket['close'],
//     url: WebSocket['url'],
//     send: WebSocket['send'],
//     protocol: WebSocket['protocol'],
// }

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

const createWebsocket = (log: Log, host: string, protocol: string | null): WebSocket | null => {
    try {
        return new WebSocket(host, protocol ?? undefined);
    } catch (error: unknown) {
        log.error(String(error));
        return null;
    }
};

const createStream = async <ReceiveT>(
    log: Log,
    from: {
        type: 'connectFrom',
        host: string,
        protocol: string | null,
        timeout: number,
    } | {
        type: 'websocket',
        socket: WebSocket,
    },
    receiveValidator: CheckByZod<ReceiveT>,
): Promise<[WebSocket, Stream<ReceiveT>] | null> => {

    const socket = from.type === 'connectFrom'
        ? createWebsocket(log, from.host, from.protocol)
        : from.socket;

    const stream = new Stream<ReceiveT>();

    if (socket === null) {
        stream.close();
        return null;
    }

    stream.onAbort(() => {
        socket.close();
    });

    let timerId: number | undefined = undefined;
    const result = new PromiseBoxOptimistic<[WebSocket, Stream<ReceiveT>] | null>();

    const clearTimer = () => {
        if (timerId !== undefined) {
            clearTimeout(timerId);
            timerId = undefined;
        }
    };

    timerId = from.type === 'connectFrom'
        ? setTimeout(() => {
            if (result.isFulfilled() === false) {
                log.error(`Timeout connection for ${from.host}, timeout=${from.timeout}`);
                stream.close();
                socket.close();
                result.resolve(null);
            }
        }, from.timeout)
        : undefined;

    switch (from.type) {
        case 'connectFrom': {
            const timeStart = new Date();
            log.info(`connect to host=${from.host}, protocol=${from.protocol}, timeout=${from.timeout}`);

            socket.addEventListener('open', () => {
                clearTimer();
                const timeEnd = new Date();
                const timeOpening = timeEnd.getTime() - timeStart.getTime();
                log.info(`connected to ${from.host} in ${timeOpening}ms`);

                result.resolve([socket, stream]);
            });
            break;
        }
        case 'websocket': {
            result.resolve([socket, stream]);
            break;
        }
    }

    socket.addEventListener('message', (data) => {
        if (typeof data.data === 'string') {
            log.debug(`RECEIVED -> string -> ${data.data}`);
            
            const result = receiveValidator.jsonParse(data.data);

            if (result.type === 'error') {
                log.error(`RECEIVED -> validation error`, result.error);
                return;
            }

            stream.push(result.data);
            return;
        }

        log.error(`RECEIVED -> unsupported message type -> ${typeof data.data}`);
    });

    socket.addEventListener('error', (data: Event) => {
        log.error(`Error connection for ${socket.url}, error=${String(data)}`, data);
        stream.close();
    });

    socket.addEventListener('close', () => {
        log.debug(`Close connection for ${socket.url}`);
        stream.close();
    });

    return result.promise;
};


export class AsyncWebSocket<ReceiveT, SendT> {
    public onAbort: (callback: () => void) => (() => void);

    private constructor(
        private log: Log,
        private readonly stream: Stream<ReceiveT>,
        private readonly socket: {
            send: (message: string) => void,
        },
        private readonly sendValidator: CheckByZod<SendT>,
    ) {
        this.onAbort = this.stream.onAbort;
    }

    subscribe(): AsyncIterable<ReceiveT> {
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

    public send = (data: SendT): void => {
        if (this.isClose()) {
            this.log.warn(`Ignore send message (socket is close)`, data);
        } else {
            const check = this.sendValidator.check(data);

            if (check.type === 'error') {
                this.log.error('Send validation error', check.error);
                return;
            }

            const stringified = JSON.stringify(data);
            this.log.debug('SEND ->', stringified);
            this.socket.send(stringified);
        }
    }

    static async fromWebSocket<ReceiveT, SendT>(
        options: {
            socket: WebSocket,
            showDebugLog: boolean,
            receiveValidator: CheckByZod<ReceiveT>,
            sendValidator: CheckByZod<SendT>,
        }
    ): Promise<AsyncWebSocket<ReceiveT, SendT> | null> {
        const log = new Log(options.showDebugLog);

        const result = await createStream(
            log,
            {
                type: 'websocket',
                socket: options.socket,
            },
            options.receiveValidator
        );

        if (result === null) {
            return null;
        }

        const [ socketOut, stream ] = result;

        return new AsyncWebSocket(
            log,
            stream,
            socketOut,
            options.sendValidator
        );
    }

    static async create<ReceiveT, SendT>(
        options: {
            host: string,
            protocol: string | null,
            timeout: number,
            showDebugLog: boolean,
            receiveValidator: CheckByZod<ReceiveT>,
            sendValidator: CheckByZod<SendT>,
        }
    ): Promise<AsyncWebSocket<ReceiveT, SendT> | null> {
        const log = new Log(options.showDebugLog);

        const result = await createStream(
            log,
            {
                type: 'connectFrom',
                host: options.host,
                protocol: options.protocol,
                timeout: options.timeout,
            },
            options.receiveValidator
        );

        if (result === null) {
            return null;
        }

        const [ socketOut, stream ] = result;

        return new AsyncWebSocket(
            log,
            stream,
            socketOut,
            options.sendValidator
        );
    }

    static createForTest<ReceiveT, SendT>(
        options: {
            receiveValidator: CheckByZod<ReceiveT>,
            sendValidator: CheckByZod<SendT>,
            showDebugLog?: boolean,
        }
    ): [ControlWebSocket<ReceiveT, SendT>, AsyncWebSocket<ReceiveT, SendT>] {
        const log = new Log(options.showDebugLog ?? false);
        const stream = new Stream<ReceiveT>();
        let sentMessages: Array<SendT> = [];
        const control = new ControlWebSocket<ReceiveT, SendT>(
            stream,
            (): Array<SendT> => {
                const messages = sentMessages;
                sentMessages = [];
                return messages;
            },
        );

        const mockSocket = {
            send: (data: string) => {
                const parsed = JSON.parse(data);
                sentMessages.push(parsed as SendT); //TODO
            },
        };

        return [
            control,
            new AsyncWebSocket(
                log,
                stream,
                mockSocket,
                options.sendValidator
            )
        ];
    }
}

class ControlWebSocket<ReceiveT, SendT> {
    constructor(
        private readonly stream: Stream<ReceiveT>,
        private readonly getSentMessages: () => Array<SendT>,
    ) {}

    takeSendMessages(): Array<SendT> {
        return this.getSentMessages();
    }

    send(message: ReceiveT) {
        this.stream.push(message);
    }

    close() {
        this.stream.close();
    }
}
