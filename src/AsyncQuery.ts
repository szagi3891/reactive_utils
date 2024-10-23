import { AbortBox } from "./AbortBox.ts";
import { PromiseBox } from "./PromiseBox.ts";

export class AsyncQueryIterator<T> {
    private isSubscribe: boolean = true;
    private currentBox: PromiseBox<T | null> | null = null;

    constructor(private readonly get: () => PromiseBox<T | null>) {}

    [Symbol.asyncIterator]() {
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
            
            
            if (value === null) {
                return {
                    value: undefined,
                    done: true,
                };
            }

            return {
                value,
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
            this.currentBox?.resolve(null);
        }
    }
}

export class AsyncQuery<T> {
    private receiviers: Array<PromiseBox<T | null>> = [];
    private senders: Array<PromiseBox<T | null>> | null = []; //null - query is close
    private readonly abort: AbortBox = new AbortBox();
    public onAbort = this.abort.onAbort;

    constructor() {
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
                const box = new PromiseBox<T | null>();
                this.receiviers.push(box);
                box.resolve(value);
                return;
            }

            if (first.isFulfilled() === false) {
                first.resolve(value);
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
            sender.resolve(null);
        }
    }

    private get = (): PromiseBox<T | null> => {
        if (this.senders === null) {
            const box = new PromiseBox<T | null>();
            box.resolve(null);
            return box;
        }

        const first = this.receiviers.shift();

        if (first === undefined) {
            const box = new PromiseBox<T | null>();
            this.senders.push(box);
            return box;
        }

        return first;
    };

    public subscribe(): AsyncQueryIterator<T> {
        return new AsyncQueryIterator(this.get);
    }
}
