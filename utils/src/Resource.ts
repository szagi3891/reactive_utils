import { autorun, IAtom } from 'mobx';
import { PromiseBox } from './PromiseBox.ts';
import { Result } from "./Result.ts";
import { assertNever } from "./assertNever.ts";
import { createConnectAtom } from "./reactive/createConnectAtom.ts";

const send = <T>(loadValue: () => Promise<T>): Promise<Result<T, null>> => {
    const response = new PromiseBox<Result<T, null>>();

    (async () => {
        try {
            const loadedValue = await loadValue();
            response.resolve(Result.ok(loadedValue));
        } catch (err) {
            console.error(err);
            response.resolve(Result.error(null));
        }
    })();

    return response.promise;
};


export class Resource<T> {
    private readonly atom: IAtom;
    // private data: ValueVersion<T>;
    private revision: number;
    // private type: 'optimistic' | 'value';
    private value: Result<T, null>;
    
    // private current: ValueUnsafe<ValueVersion<T>>;

    private constructor(private readonly loadValue: () => Promise<T>, onConnect?: () => (() => void)) {
        this.atom = createConnectAtom('resource', onConnect);
        this.revision = 0;
        // this.type = 'optimistic';
        this.value = Result.error(null);
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

        if (this.revision <= revision) {
            this.revision = revision;
            // this.type = 'value';
            this.value = response;

            this.atom.reportChanged();
        }
    }

    private init() {
        if (this.revision === 0) {
            this.revision = 1;
            // this.type = 'optimistic';
            this.value = Result.error(null);

            setTimeout(() => {
                this.requestData(1);
            }, 0);
        }
    }

    public get = (): Result<T, null> => {
        this.init();

        this.atom.reportObserved();
        return this.value;
    }

    private applyOptimisticUpdate(
        prevValue: Result<T, null>,
        optimisticUpdate?: (prevValue: T) => T
    ): [boolean, Result<T, null>] {

        if (prevValue.type === 'ok' && optimisticUpdate !== undefined) {
            return [true, Result.ok(optimisticUpdate(prevValue.data))];
        }

        return [false, prevValue];
    }

    public refresh = async (optimisticUpdate?: (prevValue: T) => T): Promise<void> => {
        if (this.revision === 0) {
            return;
        }

        const nextRevision = this.revision + 1;
        const [needTrigger, optimisticNextValue] = this.applyOptimisticUpdate(
            this.value,
            optimisticUpdate
        );

        // this.type = 'optimistic';
        this.revision = nextRevision;
        this.value = optimisticNextValue;

        if (needTrigger) {
            this.atom.reportChanged();
        }

        await this.requestData(nextRevision);
    }

    //---------------------------------------------------------------------------------------------------------
    //wtórne metody bazujące na .get()
    //---------------------------------------------------------------------------------------------------------

    /**
     * @deprecated - please stop using this method
     */
    public getAsync = (): Promise<T> => {
        const result = new PromiseBox<T>();

        const dispose = autorun((dispose) => {
            const data = this.get();

            if (data.type === 'ok') {
                result.resolve(data.data);
                dispose.dispose();
                return;
            }

            if (data.type === 'error') {
                return;
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

    public getReady = (): T | null => {
        const result = this.get();

        if (result.type === 'ok') {
            return result.data;
        }

        return null;
    }
}

