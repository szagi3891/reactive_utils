import z from 'zod';
import { Signal } from './reactive/Signal.ts';
import { autorun } from 'mobx';

type UnsubscrbeType = () => void;
type ConnectType<T> = (setValue: (newValue: T) => void) => UnsubscrbeType;

const isServer = () => typeof window === 'undefined';

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
    private readonly value: Signal<T>;

    constructor(storageType: 'localStorage' | 'sessionStorage', localStorageKey: string, value: T, decoder: z.ZodType<T>, onConnect?: ConnectType<T>) {
        const storage = new Storage(storageType);

        const initValue = getInitValue(storage, localStorageKey, value, decoder);

        this.value = new Signal(initValue, onConnect);

        if (!isServer()) {
            autorun(() => {
                const serialized = JSON.stringify(this.value.getValue());
                storage.set(localStorageKey, serialized);
            });
        }
    }

    public setValue(value: T) {
        this.value.setValue(value);
    }

    public getValue(): T {
        return this.value.getValue();
    }
}