import { AbortBox } from "./AbortBox.ts";
import { PromiseBox } from "./PromiseBox.ts";
import { Result } from "./Result.ts";

// export interface AsyncIteratorType<T> {
//     [Symbol.asyncIterator](): { next: () => Promise<IteratorResult<T>> },
// }

// export interface AsyncQueryIteratorResult<T> {
//     next(): Promise<IteratorResult<T>>,
// }

export class AsyncQueryIterator<T> implements AsyncIterable<T> {
    constructor(private readonly get: () => PromiseBox<Result<T, null>>) {}

    public [Symbol.asyncIterator](): AsyncIterator<T, void, void> {
    // public [Symbol.asyncIterator](): AsyncQueryIteratorResult<T> {
        const next = async (): Promise<IteratorResult<T>> => {
            const box = this.get();
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
}

export class AsyncQuery<T> {
    private receiviers: Array<PromiseBox<Result<T, null>>> = [];
    private senders: Array<PromiseBox<Result<T, null>>> | null = []; //null - query is close
    private readonly abort: AbortBox = new AbortBox();
    public onAbort: (callback: () => void) => (() => void);

    constructor(controller?: AbortController) {
        this.onAbort = this.abort.onAbort;

        if (controller) {
            controller.signal.addEventListener('abort', () => {
                this.close();
            });
        }
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
