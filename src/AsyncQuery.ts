import { AbortBox } from "./AbortBox.ts";
import { PromiseBox } from "./PromiseBox.ts";
import { Result } from "./Result.ts";

export interface AsyncIteratorType<T> {
    [Symbol.asyncIterator](): { next: () => Promise<IteratorResult<T>> },
    map<K>(mapFn: (value: T) => Result<K, null>): AsyncIteratorType<K>,
}

const buildMap = <T>(iterator2: () => AsyncIteratorType<T>): (<K>(mapFn: (value: T) => Result<K, null>) => AsyncIteratorType<K>) => {

    return <K>(mapFn: (value: T) => Result<K, null>): AsyncIteratorType<K> => {

        const iterator = iterator2()[Symbol.asyncIterator]();

        const next = async (): Promise<IteratorResult<K>> => {
            while (true) {
                const value = await iterator.next();

                if (value.done === false) {
                    const result = mapFn(value.value);

                    if (result.type === 'ok') {
                        return {
                            value: result.data,
                            done: false,
                        };
                    }

                    continue;
                }

                return {
                    value: undefined,
                    done: true,
                };
            }
        };
    
        // throw Error('TODO');

        const result: AsyncIteratorType<K> = {
            [Symbol.asyncIterator]: () => {
                return {
                    next,
                };
            },
            map: buildMap(() => result),
        };

        return result;
    };

    // throw Error('');
};

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
                value: value.data,
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

    public map: <K>(mapFn: (value: T) => Result<K, null>) => AsyncIteratorType<K> = buildMap(() => this);
}

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
