import z from "zod";
import type { ConnectType } from "../createConnectAtom.ts";
import { Storage, decodeStoredValue, isBrowser, isServer } from "./localStorage.ts";

/**
 * The storage is the only place the value lives: `get` reads it, `set` writes it. There is no copy and no timer,
 * so the value does not depend on when the signal was created or first observed.
 *
 * `onChange` tells the signal that the value changed behind its back (another tab wrote the key).
 */
export const withLocalStorage = <T>(params: {
    storageType: 'localStorage' | 'sessionStorage',
    localStorageKey: string,
    value: T,
    decoder: z.ZodType<T>,
    onConnect: ConnectType | undefined,
    onChange: () => void,
}): { source: { value: T }, connect: ConnectType | undefined } => {
    const { storageType, localStorageKey, value, decoder, onConnect, onChange } = params;
    const storage = new Storage(storageType);

    // Decoding is skipped while the raw string is the same, so `get()` returns the same object until the storage changes.
    let cache: { raw: string | null, value: T } | null = null;

    const read = (): T => {
        if (isServer()) {
            return value;
        }

        const raw = storage.get(localStorageKey);

        if (cache !== null && cache.raw === raw) {
            return cache.value;
        }

        const decoded = raw === null ? value : decodeStoredValue(raw, localStorageKey, value, decoder);
        cache = { raw, value: decoded };

        return decoded;
    };

    const source = {
        get value(): T {
            return read();
        },
        set value(newValue: T) {
            if (isServer()) {
                return;
            }

            const raw = JSON.stringify(newValue);
            storage.set(localStorageKey, raw);
            cache = { raw, value: newValue };
        }
    };

    // Another tab writing the key changes the value, so a watched signal follows it. Only localStorage is shared between tabs.
    const connect: ConnectType | undefined = storageType === 'localStorage' && isBrowser()
        ? () => {
            const onStorage = (event: StorageEvent) => {
                if (event.storageArea === localStorage && (event.key === localStorageKey || event.key === null)) {
                    onChange();
                }
            };
            globalThis.addEventListener('storage', onStorage);
            const unsubscribe = onConnect?.();

            return () => {
                globalThis.removeEventListener('storage', onStorage);
                unsubscribe?.();
            };
        }
        : onConnect;

    return { source, connect };
};
