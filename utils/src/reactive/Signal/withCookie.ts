import z from "zod";
import type { ConnectType } from "../createConnectAtom.ts";
import { type CookieOptions, hasDocument, isCookieNameValid, readCookieRaw, writeCookieRaw } from "./cookie.ts";
import { decodeStoredValue } from "./localStorage.ts";

/**
 * The cookie is the only place the value lives: `get` reads `document.cookie`, `set` writes it. There is no copy and
 * no timer.
 *
 * `onChange` tells the signal that the value changed behind its back (the Cookie Store API reported a change).
 */
export const withCookie = <T>(params: {
    cookieName: string,
    value: T,
    decoder: z.ZodType<T>,
    options: CookieOptions | undefined,
    onConnect: ConnectType | undefined,
    onChange: () => void,
}): { source: { value: T }, connect: ConnectType | undefined } => {
    const { cookieName, value, decoder, options, onConnect, onChange } = params;

    if (!isCookieNameValid(cookieName)) {
        throw new Error(`Invalid cookie name: ${cookieName}`);
    }

    // Decoding is skipped while the raw cookie is the same, so `get()` returns the same object until the cookie changes.
    let cache: { raw: string | null, value: T } | null = null;

    const read = (): T => {
        if (!hasDocument()) {
            return value;
        }

        const raw = readCookieRaw(cookieName);

        if (cache !== null && cache.raw === raw) {
            return cache.value;
        }

        let decoded = value;
        if (raw !== null) {
            try {
                decoded = decodeStoredValue(decodeURIComponent(raw), cookieName, value, decoder, 'cookie');
            } catch (_error: unknown) {
                console.warn(`Ignore value from cookie key=${cookieName}`);
            }
        }
        cache = { raw, value: decoded };

        return decoded;
    };

    const source = {
        get value(): T {
            return read();
        },
        set value(newValue: T) {
            if (!hasDocument()) {
                return;
            }

            const raw = encodeURIComponent(JSON.stringify(newValue));
            writeCookieRaw(cookieName, raw, options);
            cache = { raw, value: newValue };
        }
    };

    const connect: ConnectType | undefined = hasDocument() && 'cookieStore' in globalThis
        ? () => {
            const store = (globalThis as unknown as { cookieStore: EventTarget }).cookieStore;
            store.addEventListener('change', onChange);
            const unsubscribe = onConnect?.();

            return () => {
                store.removeEventListener('change', onChange);
                unsubscribe?.();
            };
        }
        : onConnect;

    return { source, connect };
};
