import { AbortBox } from "./AbortBox.ts";
import { PromiseBox } from "./PromiseBox.ts";
import { Result } from "./Result.ts";

interface AsyncIteratorType<T> {
    [Symbol.asyncIterator](): { next: () => Promise<IteratorResult<T>> },
}

export class AsyncQueryIterator<T> implements AsyncIteratorType<T> {
    private isSubscribe: boolean = true;
    private currentBox: PromiseBox<Result<T, null>> | null = null;

    constructor(private readonly get: () => PromiseBox<Result<T, null>>) {}

    [Symbol.asyncIterator](): { next: () => Promise<IteratorResult<T>> } {
        const next = async (): Promise<IteratorResult<T>> => {
            if (this.isSubscribe === false) {
                return {
                    value: undefined,
                    done: true,
                };
            }

            const box = this.get();
            this.currentBox = box;

            const value = await box.promise;
            
            
            if (value.type === 'error') {
                return {
                    value: undefined,
                    done: true,
                };
            }

            return {
                value: value.value,
                done: false,
            };
        }

        return {
            next,
        };
    }

    unsubscribe() {
        if (this.isSubscribe === true) {
            this.isSubscribe = false;
            this.currentBox?.resolve(Result.error(null));
        }
    }

    public map<K>(mapFn: (value: T) => K): AsyncIteratorType<K> {
        const iterator = this[Symbol.asyncIterator]();

        const next = async (): Promise<IteratorResult<K>> => {
            const value = await iterator.next();

            if (value.done === false) {
                return {
                    value: mapFn(value.value),
                    done: false,
                };
            }

            return {
                value: undefined,
                done: true,
            };
        };

        return {
            [Symbol.asyncIterator]: () => {
                return {
                    next,
                };
            }
        };
    }
}

// const dd: Result<string, string> = Result.ok('a');

export class AsyncQuery<T> {
    private receiviers: Array<PromiseBox<Result<T, null>>> = [];
    private senders: Array<PromiseBox<Result<T, null>>> | null = []; //null - query is close
    private readonly abort: AbortBox = new AbortBox();
    public onAbort: (callback: () => void) => (() => void);

    constructor() {
        this.onAbort = this.abort.onAbort;
    }

    [Symbol.dispose]() {
        this.close();
    }

    public isClose(): boolean {
        return this.senders === null;
    }

    public isOpen(): boolean {
        return this.isClose() === false;
    }

    public push(value: T): void {
        if (this.senders === null) {
            console.warn('AsyncQuery is close');
            return;
        }

        while (true) {
            const first = this.senders.shift();

            if (first === undefined) {
                const box = new PromiseBox<Result<T, null>>();
                this.receiviers.push(box);
                box.resolve(Result.ok(value));
                return;
            }

            if (first.isFulfilled() === false) {
                first.resolve(Result.ok(value));
                return;
            }
        }
    }

    public close(): void {
        this.abort.abort();

        if (this.senders === null) {
            return;
        }
        const senders = [...this.senders];
        this.senders = null;

        for (const sender of senders) {
            sender.resolve(Result.error(null));
        }
    }

    private get = (): PromiseBox<Result<T, null>> => {
        if (this.senders === null) {
            const box = new PromiseBox<Result<T, null>>();
            box.resolve(Result.error(null));
            return box;
        }

        const first = this.receiviers.shift();

        if (first === undefined) {
            const box = new PromiseBox<Result<T, null>>();
            this.senders.push(box);
            return box;
        }

        return first;
    };

    public subscribe(): AsyncQueryIterator<T> {
        return new AsyncQueryIterator(this.get);
    }
}
