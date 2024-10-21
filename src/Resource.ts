import { autorun } from 'mobx';
import { PromiseBox } from './PromiseBox.ts';
import { Value, type ConnectType } from './Value.ts';

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

export namespace ResourceResult {
    export const ok = <T>(value: T): ResultReady<T> => {
        return {
            type: 'ready',
            value
        };
    }
  
    export const error = (message: string): ResultError => {
        return {
            type: 'error',
            message,
        };
    }
}

export type ResourceResult<T> = ResultLoading | ResultReady<T> | ResultError;

const send = <T>(loadValue: () => Promise<T>): Promise<ResourceResult<T>> => {
    const response = new PromiseBox<ResourceResult<T>>();

    const timer = setTimeout(() => {
        response.resolve({
            type: 'error',
            message: 'timeout',
        });
    }, TIMEOUT);

    (async () => {
        try {
            const loadedValue = await loadValue();

            clearTimeout(timer);
            response.resolve({
                type: 'ready',
                value: loadedValue,
            });
        } catch (err) {
            console.error(err);

            clearTimeout(timer);
            response.resolve({
                type: 'error',
                message: String(err),
            });
        }
    })();

    return response.promise;
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

    private constructor(private readonly loadValue: () => Promise<T>, onConnect?: ConnectType<Request<T>>) {
        this.request = new Value(
            new Request(this.loadValue, null),
            onConnect
        );
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

    public getAsync(): Promise<T> {
        const result = new PromiseBox<T>();

        const dispose = autorun((dispose) => {
            const data = this.get();

            if (data.type === 'loading') {
                return;
            }

            if (data.type === 'error') {
                result.reject(data.message);
                dispose.dispose();
                return;
            }

            result.resolve(data.value);
            dispose.dispose();
        });

        const timeout = new Error('Timeout');

        setTimeout(() => {
            result.reject(timeout);
            dispose();
        }, 10_000);

        return result.promise;
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

    private applyOptimisticUpdate(
        prevValue: ResourceResult<T>,
        optimisticUpdate?: (prevValue: T) => T
    ): ResourceResult<T> {
        if (prevValue.type === 'ready' && optimisticUpdate !== undefined) {
            return ResourceResult.ok(optimisticUpdate(prevValue.value));
        }

        return prevValue;
    }

    public async refresh(optimisticUpdate?: (prevValue: T) => T): Promise<void> {
        if (this.request.getValue().isInitValue() === false) {
            return;
        }

        const currentRequest = this.request.getValue().value.getValue();
        if (currentRequest.type === 'loading') {
            return currentRequest.whenReady;
        }

        const prevValue = this.get();
        const request = new Request(
            this.loadValue,
            this.applyOptimisticUpdate(prevValue, optimisticUpdate),
        );
        request.init();

        this.request.setValue(request);
        await request.whenReady.promise;
    }
}
