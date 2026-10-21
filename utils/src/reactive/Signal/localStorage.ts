import z from 'zod';

export const isServer = () => typeof window === 'undefined';
export const isBrowser = () => !isServer();

export class Storage {
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

export const decodeStoredValue = <T>(raw: string, localStorageKey: string, value: T, decoder: z.ZodType<T>, source = 'localStorage'): T => {
    try {
        const valueJson = JSON.parse(raw);

        const valueSafe = decoder.safeParse(valueJson);

        if (valueSafe.success) {
            return valueSafe.data;
        }
    } catch (_error: unknown) {
        console.warn(`Ignore value from ${source} key=${localStorageKey}`);
    }

    return value;
};

export const getInitValue = <T>(storage: Storage, localStorageKey: string, value: T, decoder: z.ZodType<T>): T => {
    if (isServer()) {
        return value;
    }

    const valueLocalStorage = storage.get(localStorageKey);

    if (valueLocalStorage === null) {
        return value;
    }

    return decodeStoredValue(valueLocalStorage, localStorageKey, value, decoder);
};
