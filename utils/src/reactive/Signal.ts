import type { IAtom } from "mobx";
import { ConnectType, createConnectAtom } from "./createConnectAtom.ts";
import { withKeepAlive } from "./Signal/withKeepAlive.ts";
import z from "zod";
import { withLocalStorage } from "./Signal/withLocalStorage.ts";
import { Computed } from "./Computed.ts";
import type { CookieOptions } from "./Signal/cookie.ts";
import { withCookie } from "./Signal/withCookie.ts";

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


    /**
     * The storage is the only place the value lives: `get()` reads it, `set()` writes it. There is no copy in the
     * signal and no timer, so the value does not depend on when the signal was created or first observed.
     *
     * On the server there is no storage, so `get()` returns `value` and `set()` is ignored.
     * In the browser the value is available from the first `get()`. A component that renders it into HTML which the
     * server also renders will not match the server HTML on hydration, so keep such values out of that HTML.
     */
    private static withLocalStorageKind<T>(
        storageType: 'localStorage' | 'sessionStorage',
        localStorageKey: string,
        value: T,
        decoder: z.ZodType<T>,
        onConnect: ConnectType | undefined
    ): Signal<T> {
        const { source, connect } = withLocalStorage({
            storageType,
            localStorageKey,
            value,
            decoder,
            onConnect,
            onChange: () => signal.atom.reportChanged(),
        });
        const signal = Signal.createSource<T>(source, connect);

        return signal;
    }


    /**
     * The cookie is the only place the value lives: `get()` reads `document.cookie`, `set()` writes it. The value is
     * stored as JSON, URI encoded, so it is a single cookie of a few KB at most.
     *
     * Without a `document` (on the server) `get()` returns `value` and `set()` is ignored; a server that wants the
     * cookie reads it from the request. In the browser the value is available from the first `get()`, so a component
     * that renders it into HTML which the server rendered with the default will not match on hydration.
     *
     * A write is seen by observers at once. A change made elsewhere (another tab, the server) is seen on the next
     * `get()`, and watched signals follow it too when the browser has the Cookie Store API.
     */
    public static withCookie<T>(params: CookieParams<T>): Signal<T> {
        const { source, connect } = withCookie({
            cookieName: params.cookieName,
            value: params.value,
            decoder: params.decoder,
            options: params.options,
            onConnect: params.onConnect,
            onChange: () => signal.atom.reportChanged(),
        });
        const signal = Signal.createSource<T>(source, connect);

        return signal;
    }

    public static withLocalStorage<T>(params: LocalStorageParams<T>): Signal<T> {
        const { localStorageKey, value, decoder, onConnect } = params;

        return Signal.withLocalStorageKind('localStorage', localStorageKey, value, decoder, onConnect);
    }

    public static withSessionStorage<T>(params: LocalStorageParams<T>): Signal<T> {
        const { localStorageKey, value, decoder, onConnect } = params;

        return Signal.withLocalStorageKind('sessionStorage', localStorageKey, value, decoder, onConnect);
    }
}

interface LocalStorageParams<T> {
    localStorageKey: string;
    value: T;
    decoder: z.ZodType<T>;
    /** @deprecated Ignored. The value is always read from the storage when it is used, so there is nothing to initialise later. */
    asyncInit?: boolean,
    onConnect?: ConnectType;
}

interface CookieParams<T> {
    cookieName: string;
    /** Used when there is no cookie, it holds something that does not decode, or there is no `document`. */
    value: T;
    decoder: z.ZodType<T>;
    options?: CookieOptions;
    onConnect?: ConnectType;
}
