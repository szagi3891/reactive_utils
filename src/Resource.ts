import { autorun } from 'mobx';
import { PromiseBox } from './PromiseBox.ts';
import { ValueUnsafe } from './ValueUnsafe.ts';
import { Result } from "./Result.ts";
import { assertNever } from "./assertNever.ts";

const TIMEOUT = 10000;

type ResultError = {
    type: 'error',
    message: string,
} | {
    type: 'loading',
}

export namespace ResourceResult {
    export const ok = <T>(value: T): Result<T, ResultError> => {
        return Result.ok(value);
    }
  
    export const error = <T>(message: string): Result<T, ResultError> => {
        return Result.error({
            type: 'error',
            message,
        });
    }

    export const loaading = <T>(): Result<T, ResultError> => {
        return Result.error({
            type: 'loading'
        });
    }
}

export type ResourceResult<T> = Result<T, ResultError>;

const send = <T>(loadValue: () => Promise<T>): Promise<ResourceResult<T>> => {
    const response = new PromiseBox<ResourceResult<T>>();

    const timer = setTimeout(() => {
        response.resolve(ResourceResult.error('timeout'));
    }, TIMEOUT);

    (async () => {
        try {
            const loadedValue = await loadValue();

            clearTimeout(timer);
            response.resolve(Result.ok(loadedValue));
        } catch (err) {
            console.error(err);

            clearTimeout(timer);
            response.resolve(ResourceResult.error(String(err)));
        }
    })();

    return response.promise;
};

interface ValueVersion<T> {
    revision: number,
    type: 'optimistic' | 'value',
    value: ResourceResult<T>,
}

export class Resource<T> {
    private current: ValueUnsafe<ValueVersion<T>>;

    private constructor(private readonly loadValue: () => Promise<T>, onConnect?: () => (() => void)) {
        this.current = new ValueUnsafe(
            {
                revision: 0,
                type: 'optimistic',
                value: ResourceResult.loaading()
            },
            onConnect
        );
    }

    public static browserAndServer<T>(loadValue: () => Promise<T>, onConnect?: () => (() => void)): Resource<T> {
        return new Resource(loadValue, onConnect);
    }

    public static browser<T>(loadValue: () => Promise<T>, onConnect?: () => (() => void)): Resource<T> {
        //Do not initiate on server side
        if (typeof window === 'undefined') {
            return new Resource(() => new Promise(() => {}));
        } else {
            return new Resource(loadValue, onConnect);
        }
    }

    private requestData = async (revision: number): Promise<void> => {
        const response = await send(this.loadValue);

        const prevValue = this.current.value;

        if (prevValue.revision <= revision) {
            this.current.value = {
                revision,
                type: 'value',
                value: response
            };

            this.current.atom.reportChanged();
        }
    }

    private init() {
        if (this.current.value.revision === 0) {
            this.current.value = {
                revision: 1,
                type: 'optimistic',
                value: ResourceResult.loaading(),
            };

            setTimeout(() => {
                this.requestData(1);
            }, 0);
        }
    }

    //TODO - zamoenić na Result<T, loding | error>

    public get(): ResourceResult<T> {
        this.init();

        const value = this.current.value;
        this.current.atom.reportObserved();

        return value.value;
    }

    private applyOptimisticUpdate(
        prevValue: ResourceResult<T>,
        optimisticUpdate?: (prevValue: T) => T
    ): [boolean, ResourceResult<T>] {

        if (prevValue.type === 'ok' && optimisticUpdate !== undefined) {
            return [true, ResourceResult.ok(optimisticUpdate(prevValue.data))];
        }

        return [false, prevValue];
    }

    public async refresh(optimisticUpdate?: (prevValue: T) => T): Promise<void> {
        if (this.current.value.revision === 0) {
            return;
        }

        const nextRevision = this.current.value.revision + 1;
        const [needTrigger, optimisticNextValue] = this.applyOptimisticUpdate(
            this.current.value.value,
            optimisticUpdate
        );

        this.current.value = {
            type: 'optimistic',
            revision: nextRevision,
            value: optimisticNextValue,
        };

        if (needTrigger) {
            this.current.atom.reportChanged();
        }

        await this.requestData(nextRevision);
    }

    //---------------------------------------------------------------------------------------------------------
    //wtórne metody bazujące na .get()
    //---------------------------------------------------------------------------------------------------------

    public getAsync(): Promise<T> {
        const result = new PromiseBox<T>();

        const dispose = autorun((dispose) => {
            const data = this.get();

            if (data.type === 'ok') {
                result.resolve(data.data);
                dispose.dispose();
                return;
            }

            if (data.type === 'error') {
                const error = data.error;

                if (error.type === 'loading') {
                    return;
                }

                if (error.type === 'error') {
                    result.reject(error.message);
                    dispose.dispose();
                    return;
                }
                return assertNever(error);
            }
            
            return assertNever(data);
        });

        const timeout = new Error('Timeout');

        setTimeout(() => {
            result.reject(timeout);
            dispose();
        }, 10_000);

        return result.promise;
    }

    public getReady(): T | null {
        const result = this.get();

        if (result.type === 'ok') {
            return result.data;
        }

        return null;
    }
}

