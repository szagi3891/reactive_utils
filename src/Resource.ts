import { PromiseBox } from './PromiseBox.ts';
import { Value } from './Value.ts';

const TIMEOUT = 10000;

interface ResultLoading {
    readonly type: 'loading';
    readonly whenReady: Promise<void>;
}

interface ResultReady<T> {
    readonly type: 'ready';
    readonly value: T;
}

interface ResultError {
    readonly type: 'error';
    readonly message: string;
}

export type ResourceResult<T> = ResultLoading | ResultReady<T> | ResultError;

const send = <T>(loadValue: () => Promise<T>): Promise<ResourceResult<T>> => {
    return new Promise(async (resolve) => {
        setTimeout(() => {
            resolve({
                type: 'error',
                message: 'timeout',
            });
        }, TIMEOUT);

        try {
            const loadedValue = await loadValue();

            resolve({
                type: 'ready',
                value: loadedValue,
            });
        } catch (err) {
            console.error(err);

            resolve({
                type: 'error',
                message: String(err),
            });
        }
    });
};

class Request<T> {
    private isInit: boolean = false;
    public readonly whenReady: PromiseBox<void>;
    public readonly value: Value<ResourceResult<T>>;

    public constructor(private readonly getValue: () => Promise<T>, private readonly prevValue: ResourceResult<T> | null) {        
        this.whenReady = new PromiseBox<void>();

        this.value = new Value({
            type: 'loading',
            whenReady: this.whenReady.promise,
        });
    }

    public static new() {

    }

    public isInitValue(): boolean {
        return this.isInit;
    }

    public init(): void {
        if (this.isInit) {
            return;
        }

        this.isInit = true;

        setTimeout(async () => {
            const valuePromise = send(this.getValue);
            const value = await valuePromise;
            this.value.setValue(value);
            this.whenReady.resolve();
        }, 0);
    }

    public get(): ResourceResult<T> {
        const current = this.value.getValue();

        if (current.type !== 'loading') {
            return current;
        }

        if (this.prevValue !== null) {
            return this.prevValue;
        }

        return current;
    }
}

export class Resource<T> {
    private request: Value<Request<T>>;

    private constructor(private readonly loadValue: () => Promise<T>) {
        this.request = new Value(new Request(this.loadValue, null));
    }

    public static browserAndServer<T>(loadValue: () => Promise<T>): Resource<T> {
        return new Resource(loadValue);
    }

    public static browser<T>(loadValue: () => Promise<T>): Resource<T> {
        //Do not initiate on server side
        if (typeof window === 'undefined') {
            return new Resource(() => new Promise(() => {}));
        } else {
            return new Resource(loadValue);
        }
    }

    public get(): ResourceResult<T> {
        const request = this.request.getValue();
        request.init();
        return request.get();
    }

    public getReady(): T | null {
        const result = this.get();

        if (result.type === 'ready') {
            return result.value;
        }

        return null;
    }

    public async refresh(): Promise<void> {
        if (this.request.getValue().isInitValue() === false) {
            return;
        }

        const currentRequest = this.request.getValue().value.getValue();
        if (currentRequest.type === 'loading') {
            return currentRequest.whenReady;
        }

        const prevValue = this.get();
        const request = new Request(this.loadValue, prevValue);
        request.init();

        this.request.setValue(request);
        await request.whenReady.promise;
    }
}
