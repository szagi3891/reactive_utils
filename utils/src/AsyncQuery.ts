import { Result } from "./Result.ts";

interface QueueNode<T> {
    value: T;
    next: QueueNode<T> | null;
}

class FastQueue<T> {
    private head: QueueNode<T> | null = null;
    private tail: QueueNode<T> | null = null;

    public push(value: T): void {
        const node: QueueNode<T> = { value, next: null };
        if (this.tail) {
            this.tail.next = node;
            this.tail = node;
        } else {
            this.head = node;
            this.tail = node;
        }
    }

    public shift(): T | undefined {
        if (!this.head) return undefined;
        const value = this.head.value;
        this.head = this.head.next;
        if (!this.head) this.tail = null;
        return value;
    }
}

export class AsyncQueryIterator<T> implements AsyncIterable<T> {
    constructor(private readonly getNext: () => Promise<Result<T, null>>) {}

    public [Symbol.asyncIterator](): AsyncIterator<T, void, void> {
        return {
            next: async (): Promise<IteratorResult<T>> => {
                const value = await this.getNext();
                
                if (value.type === 'error') {
                    return {
                        value: undefined,
                        done: true,
                    };
                }

                return {
                    value: value.data,
                    done: false,
                };
            }
        };
    }
}

type Consumer<T> = ReturnType<typeof Promise.withResolvers<Result<T, null>>>;

export class AsyncQuery<T> {
    private buffer: FastQueue<T> = new FastQueue();
    private waitingConsumers: FastQueue<Consumer<T>> | null = new FastQueue(); // null means query is closed
    private readonly controller: AbortController = new AbortController();

    constructor(controller?: AbortController) {
        if (controller) {
            controller.signal.addEventListener('abort', () => {
                this.close();
            });
        }
    }

    [Symbol.dispose]() {
        this.close();
    }

    public onAbort = (callback: () => void): (() => void) => {
        const signal = this.controller.signal;
        if (signal.aborted) {
            callback();
            return () => {};
        }

        signal.addEventListener('abort', callback, { once: true });
        return () => {
            signal.removeEventListener('abort', callback);
        };
    }

    public isClose(): boolean {
        return this.waitingConsumers === null;
    }

    public isOpen(): boolean {
        return this.waitingConsumers !== null;
    }

    public push(value: T): void {
        if (this.waitingConsumers === null) {
            console.warn('AsyncQuery is closed');
            return;
        }

        while (true) {
            const consumer = this.waitingConsumers.shift();

            if (consumer === undefined) {
                this.buffer.push(value);
                return;
            }

            consumer.resolve(Result.ok(value));
            return;
        }
    }

    public close(): void {
        this.controller.abort();

        if (this.waitingConsumers === null) {
            return;
        }

        const consumers = this.waitingConsumers;
        this.waitingConsumers = null;

        while (true) {
            const first = consumers.shift();
            if (first === undefined) {
                return;
            }

            first.resolve(Result.error(null));
        }
    }

    private getNext = (): Promise<Result<T, null>> => {
        if (this.waitingConsumers === null) {
            return Promise.resolve(Result.error(null));
        }

        const value = this.buffer.shift();

        if (value === undefined) {
            const consumer = Promise.withResolvers<Result<T, null>>();
            this.waitingConsumers.push(consumer);
            return consumer.promise;
        }

        return Promise.resolve(Result.ok(value));
    };

    public subscribe(): AsyncIterable<T> {
        return new AsyncQueryIterator(this.getNext);
    }

    public get(): Promise<Result<T, null>> {
        return this.getNext();
    }
}


