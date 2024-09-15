import { PromiseBox } from './PromiseBox';

interface AsyncQueryIterator<T> {
    next(): Promise<IteratorResult<T>>;
}

export class AsyncQuery<T> {
    private receiviers: Array<Promise<T | null>> = [];
    private senders: Array<PromiseBox<T | null>> | null = []; //null - query is close
    private iteratorCreated: null | Error = null;

    public isClose(): boolean {
        return this.senders === null;
    }

    public push(value: T): void {
        if (this.senders === null) {
            console.warn('AsyncQuery is close');
            return;
        }

        const first = this.senders.shift();

        if (first !== undefined) {
            first.resolve(value);
            return;
        }

        const box = new PromiseBox<T | null>();
        this.receiviers.push(box.promise);
        box.resolve(value);
    }

    public close(): void {
        if (this.senders === null) {
            return;
        }
        const senders = [...this.senders];
        this.senders = null;

        for (const sender of senders) {
            sender.resolve(null);
        }
    }

    private get = async (): Promise<T | null> => {
        if (this.senders === null) {
            return Promise.resolve(null);
        }

        const first = this.receiviers.shift();

        if (first !== undefined) {
            return first;
        }

        const box = new PromiseBox<T | null>();
        this.senders.push(box);
        return box.promise;
    };


    public [Symbol.asyncIterator](): AsyncQueryIterator<T> {

        if (this.iteratorCreated !== null) {
            console.error(this.iteratorCreated);
            throw Error('The iterator is already active. It cannot be read multiple times');
        }

        this.iteratorCreated = new Error('Iterator - first usage');

        const get = this.get;

        return {
            async next(): Promise<IteratorResult<T>> {
                const value = await get();
                
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
        };
    }
}
