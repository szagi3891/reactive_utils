import type { IAtom } from "mobx";
import { ConnectType, createConnectAtom } from "./createConnectAtom.ts";
import { withKeepAlive } from "./Signal/withKeepAlive.ts";
import z from "zod";
import { Storage, getInitValue, isBrowser } from "./Signal/localStorage.ts";
import { Computed } from "./Computed.ts";

export class Signal<T> {
    public readonly atom: IAtom;
    private readonly value: {
        value: T
    };

    private constructor(value: { value: NoInfer<T> }, onConnect?: ConnectType) {
        this.atom = createConnectAtom('signal', onConnect);
        this.value = value;
    }

    public static create<T>(value: NoInfer<T>, onConnect?: ConnectType): Signal<T> {
        return new Signal({ value }, onConnect);
    }

    public static createSource<T>(value: { value: T }, onConnect?: ConnectType): Signal<T> {
        return new Signal(value, onConnect);
    }

    public static withDefferedRead<T>(initValue: T, timeIntervalMs: number): Signal<T> {

        let value = initValue;

        const comp = Computed.withPollingSync(timeIntervalMs, () => {
            return value;
        });
        
        return new Signal({
            get value() {
                return comp.get();
            },
            set value(newValue: T) {
                value = newValue;
            }
        });
    }

    public set(value: T): void {
        this.value.value = value;
        this.atom.reportChanged();
    }

    public get(): T {
        this.atom.reportObserved();
        return this.value.value;
    }

    public isObserved(): boolean {
        return this.atom.isBeingObserved;
    }

    public static withKeepAlive<T>(timeMs: number, value: T, onConnect: ConnectType): Signal<T> {
        const connect = withKeepAlive(timeMs, onConnect);
        return new Signal({ value }, connect);
    }


    private static withLocalStorageKind<T>(
        storageType: 'localStorage' | 'sessionStorage',
        localStorageKey: string,
        value: T,
        decoder: z.ZodType<T>,
        asyncInit: boolean,
        onConnect: ConnectType | undefined
    ): Signal<T> {
        const storage = new Storage(storageType);
        let innerValue = value;
        
        const initFromLocalStorage = getInitValue(storage, localStorageKey, value, decoder);

        if (asyncInit) {
            setTimeout(() => {
                innerValue = initFromLocalStorage;
            }, 0);
        } else {
            innerValue = initFromLocalStorage;
        }

        return new Signal({
            get value() {
                return innerValue;
            },
            set value(newValue: T) {
                innerValue = newValue;
                if (isBrowser()) {
                    storage.set(localStorageKey, JSON.stringify(newValue));
                }
            }
        }, onConnect);
    }

    public static withLocalStorage<T>(params: LocalStorageParams<T>): Signal<T> {
        const { localStorageKey, value, decoder, asyncInit, onConnect } = params;

        return Signal.withLocalStorageKind('localStorage', localStorageKey, value, decoder, asyncInit ?? false, onConnect);
    }

    public static withSessionStorage<T>(params: LocalStorageParams<T>): Signal<T> {
        const { localStorageKey, value, decoder, asyncInit, onConnect } = params;

        return Signal.withLocalStorageKind('sessionStorage', localStorageKey, value, decoder, asyncInit ?? false, onConnect);
    }
}

interface LocalStorageParams<T> {
    localStorageKey: string;
    value: T;
    decoder: z.ZodType<T>;
    asyncInit?: boolean,
    onConnect?: ConnectType;
}
