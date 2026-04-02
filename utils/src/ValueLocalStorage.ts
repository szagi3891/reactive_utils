import z from 'zod';
import { IAtom } from 'mobx';
import { createConnectAtom } from "./reactive/createConnectAtom.ts";

type UnsubscrbeType = () => void;
type ConnectType = () => UnsubscrbeType;

const isServer = () => typeof window === 'undefined';
const isBrowser = () => !isServer();

class Storage {
    constructor(private readonly storage: 'localStorage' | 'sessionStorage') {}

    get = (key: string) => {
        switch (this.storage) {
            case 'localStorage': {
                return localStorage.getItem(key);
            }
            case 'sessionStorage': {
                return sessionStorage.getItem(key);
            }
        }
    }

    set = (key: string, value: string) => {
        switch (this.storage) {
            case 'localStorage': {
                return localStorage.setItem(key, value);
            }
            case 'sessionStorage': {
                return sessionStorage.setItem(key, value);
            }
        }
    }
}

const getInitValue = <T>(storage: Storage, localStorageKey: string, value: T, decoder: z.ZodType<T>): T => {
    if (isServer()) {
        return value;
    }

    const valueLocalStorage = storage.get(localStorageKey);

    if (valueLocalStorage === null) {
        return value;
    }

    try {
        const valueJson = JSON.parse(valueLocalStorage);

        const valueSafe = decoder.safeParse(valueJson);

        if (valueSafe.success) {
            return valueSafe.data;
        }
    } catch (error: unknown) {
        console.warn(`Ignore value from localStorage key=${localStorageKey}`);
    }

    return value;
};

export class ValueLocalStorage<T> {
    private readonly atom: IAtom;
    private readonly storage: Storage;
    private value: T;

    constructor(
        storageType: 'localStorage' | 'sessionStorage',
        private readonly localStorageKey: string,
        value: T,
        decoder: z.ZodType<T>,
        onConnect?: ConnectType
    ) {
        this.atom = createConnectAtom('valueLocalStorage', onConnect);
        this.storage = new Storage(storageType);
        this.value = getInitValue(this.storage, localStorageKey, value, decoder);
    }

    public set(value: T) {
        this.value = value;
        if (isBrowser()) {
            this.storage.set(this.localStorageKey, JSON.stringify(value));
        }
        this.atom.reportChanged();
    }

    public get(): T {
        this.atom.reportObserved();
        return this.value;
    }
}
