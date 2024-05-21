type ResolveFn<T> = (data: T) => void;
type RejectFn = (err: unknown) => void;

export class PromiseBox<T> {
    public readonly resolve: (value: T) => void;
    public readonly reject: (err: unknown) => void;
    public readonly promise: Promise<T>;
    private isFull: boolean;

    public constructor() {
        let resolve: ResolveFn<T> | null = null;
        let reject: RejectFn | null = null;

        this.promise = new Promise((localResolve: ResolveFn<T>, localReject: RejectFn) => {
            resolve = localResolve;
            reject = localReject;
        });

        if (resolve === null) {
            throw Error('createPromiseValue - resolve is null');
        }

        if (reject === null) {
            throw Error('createPromiseValue - reject is null');
        }

        const resolveConst: ResolveFn<T> = resolve;
        const rejectConst: RejectFn = reject;

        this.resolve = (value: T): void => {
            resolveConst(value);
            this.isFull = true;
        };

        this.reject = (error: unknown): void => {
            rejectConst(error);
            this.isFull = true;
        };

        this.isFull = false;
    }

    public isFulfilled(): boolean {
        return this.isFull;
    }
}