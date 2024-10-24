import { autorun } from 'mobx';
import { PromiseBox } from './PromiseBox.ts';
import { ValueUnsafe } from './ValueUnsafe.ts';

const TIMEOUT = 10000;

interface ResultLoading {
    readonly type: 'loading';
    // readonly whenReady: Promise<void>;
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
                value: {
                    type: 'loading'
                }
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
                value: {
                    'type': 'loading'
                }
            };

            setTimeout(() => {
                this.requestData(1);
            }, 0);
        }
    }

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

        if (prevValue.type === 'ready' && optimisticUpdate !== undefined) {
            return [true, ResourceResult.ok(optimisticUpdate(prevValue.value))];
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

    public getReady(): T | null {
        const result = this.get();

        if (result.type === 'ready') {
            return result.value;
        }

        return null;
    }
}

