import { expect } from "jsr:@std/expect";
import { Signal } from './Signal.ts';
import { autorun } from 'mobx';
import { timeout } from '../timeout.ts';
import z from 'zod';

Deno.test('basic', () => {
    const value = Signal.create(1);
    expect(value.get()).toBe(1);
    value.set(444);
    expect(value.get()).toBe(444);
});

Deno.test('SignalSource basic', () => {
    let n = 1;
    const src = Signal.createSource({
        get value() {
            return n;
        },
        set value(v) {
            n = v;
        },
    });
    expect(src.get()).toBe(1);
    src.set(2);
    expect(src.get()).toBe(2);
    expect(n).toBe(2);
});

Deno.test('SignalSource observed', () => {
    const src = Signal.createSource<number>({
        get value() {
            return 0;
        },
        set value(_v) {
            return;
        },
    });
    expect(src.isObserved()).toBe(false);
    const dispose = autorun(() => {
        src.get();
    });
    expect(src.isObserved()).toBe(true);
    dispose();
    expect(src.isObserved()).toBe(false);
});

Deno.test('SignalSource autorun reacts to set', () => {
    let n = 0;
    const src = Signal.createSource({
        get value() {
            return n;
        },
        set value(v: number) {
            n = v;
        },
    });
    let runs = 0;
    const dispose = autorun(() => {
        runs++;
        src.get();
    });
    expect(runs).toBe(1);
    src.set(1);
    expect(runs).toBe(2);
    expect(n).toBe(1);
    dispose();
});

Deno.test('SignalSource atom.reportChanged notifies when backing store mutates outside set', () => {
    let n = 0;
    const src = Signal.createSource({
        get value() {
            return n;
        },
        set value(v: number) {
            n = v;
        },
    });
    let runs = 0;
    const dispose = autorun(() => {
        runs++;
        src.get();
    });
    expect(runs).toBe(1);
    n = 7;
    src.atom.reportChanged();
    expect(runs).toBe(2);
    expect(src.get()).toBe(7);
    dispose();
});

Deno.test('SignalSource autorun ignores silent backing mutation without reportChanged', () => {
    let n = 0;
    const src = Signal.createSource({
        get value() {
            return n;
        },
        set value(v: number) {
            n = v;
        },
    });
    let runs = 0;
    const dispose = autorun(() => {
        runs++;
        src.get();
    });
    expect(runs).toBe(1);
    n = 42;
    expect(runs).toBe(1);
    dispose();
});

Deno.test('SignalSource object value', () => {
    const state = { tag: 'a' as string };
    const src = Signal.createSource<{ tag: string }>({
        get value() {
            return state;
        },
        set value(v) {
            state.tag = v.tag;
        },
    });
    expect(src.get().tag).toBe('a');
    src.set({ tag: 'b' });
    expect(src.get().tag).toBe('b');
});

Deno.test('observed', () => {
    const value = Signal.create(1);

    expect(value.isObserved()).toBe(false);
    const dispose = autorun(() => {
        value.get();
    });

    expect(value.isObserved()).toBe(true);

    dispose();
    expect(value.isObserved()).toBe(false);
});

Deno.test('connect', () => {
    let connect: boolean = false;

    const value = Signal.create(1, () => {
        connect = true;

        return () => {
            connect = false;
        };
    });

    expect(connect).toBe(false);
    expect(value.get()).toBe(1);

    const dispose = autorun(() => {
        value.get();
    });

    expect(connect).toBe(true);
    expect(value.get()).toBe(1);

    value.set(55);

    expect(connect).toBe(true);
    expect(value.get()).toBe(55);

    value.set(99);

    expect(connect).toBe(true);
    expect(value.get()).toBe(99);

    dispose();

    expect(connect).toBe(false);
    expect(value.get()).toBe(99);
});

Deno.test('withKeepAlive', async () => {
    let connectCount: number = 0;
    let connect: boolean = false;

    const value = Signal.withKeepAlive(200, 1, () => {
        connectCount++;
        connect = true;

        return () => {
            connect = false;
        };
    });

    expect(connectCount).toBe(0);
    expect(connect).toBe(false);
    expect(value.get()).toBe(1);

    const dispose = autorun(() => {
        value.get();
    });

    expect(connectCount).toBe(1);
    expect(connect).toBe(true);
    expect(value.get()).toBe(1);

    value.set(55);

    expect(connect).toBe(true);
    expect(value.get()).toBe(55);

    value.set(99);

    expect(connectCount).toBe(1);
    expect(connect).toBe(true);
    expect(value.get()).toBe(99);

    dispose();

    expect(connectCount).toBe(1);
    expect(connect).toBe(true);
    expect(value.get()).toBe(99);

    await timeout(100);
    expect(connect).toBe(true);

    await timeout(50);
    expect(connect).toBe(true);

    await timeout(100);
    expect(connect).toBe(false);

    //subscription deactivated 

    expect(connectCount).toBe(1);
    const dispose2 = autorun(() => {
        value.get();
    });

    expect(connectCount).toBe(2);
    expect(connect).toBe(true);
    dispose2();

    await timeout(100);

    const dispose3 = autorun(() => {
        value.get();
    });

    expect(connect).toBe(true);

    await timeout(300);

    expect(connectCount).toBe(2);
    expect(connect).toBe(true);

    dispose3();

    //Po to żeby timer się wyczyścił
    await timeout(500);
});
type FakeStorage = { getItem: (key: string) => string | null, setItem: (key: string, value: string) => void };

const createFakeStorage = (data: Record<string, string>): FakeStorage => ({
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
        data[key] = value;
    },
});

// Deno has no `window`, so the signal sees a server. This makes the global scope look like a browser.
const withFakeBrowser = (
    local: Record<string, string>,
    run: (local: Record<string, string>) => void | Promise<void>,
    session: Record<string, string> = {},
) => {
    const g = globalThis as Record<string, unknown>;
    const prevWindow = g.window;
    const prevLocal = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    const prevSession = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
    g.window = globalThis;
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: createFakeStorage(local) });
    Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: createFakeStorage(session) });

    const restore = () => {
        if (prevWindow === undefined) {
            delete g.window;
        } else {
            g.window = prevWindow;
        }
        for (const [name, prev] of [['localStorage', prevLocal], ['sessionStorage', prevSession]] as const) {
            if (prev === undefined) {
                delete g[name];
            } else {
                Object.defineProperty(globalThis, name, prev);
            }
        }
    };

    try {
        const result = run(local);
        if (result instanceof Promise) {
            return result.finally(restore);
        }
        restore();
    } catch (error) {
        restore();
        throw error;
    }
};

const dispatchStorageEvent = (key: string | null) => {
    const event = new Event('storage');
    Object.assign(event, { key, storageArea: localStorage });
    globalThis.dispatchEvent(event);
};

const stringSignal = (asyncInit?: boolean) => Signal.withLocalStorage({
    localStorageKey: 'k',
    value: 'default',
    decoder: z.string(),
    asyncInit,
});

Deno.test('withLocalStorage: the stored value is there on the first get, without a timer', () => {
    withFakeBrowser({ k: JSON.stringify('stored') }, () => {
        expect(stringSignal().get()).toBe('stored');
    });
});

Deno.test('withLocalStorage: asyncInit is ignored, the value is not delayed', () => {
    withFakeBrowser({ k: JSON.stringify('stored') }, () => {
        expect(stringSignal(true).get()).toBe('stored');
    });
});

Deno.test('withLocalStorage: the default applies when nothing, invalid JSON or a wrong type is stored', () => {
    withFakeBrowser({}, (data) => {
        const signal = stringSignal();
        expect(signal.get()).toBe('default');

        data.k = '{not json';
        expect(signal.get()).toBe('default');

        data.k = JSON.stringify(5);
        expect(signal.get()).toBe('default');
    });
});

Deno.test('withLocalStorage: the storage is the value, a write behind the signal is read on the next get', () => {
    withFakeBrowser({}, (data) => {
        const signal = stringSignal();
        signal.set('chosen');
        expect(data.k).toBe(JSON.stringify('chosen'));
        expect(signal.get()).toBe('chosen');

        data.k = JSON.stringify('other');
        expect(signal.get()).toBe('other');

        delete data.k;
        expect(signal.get()).toBe('default');
    });
});

Deno.test('withLocalStorage: get returns the same object until the stored string changes', () => {
    withFakeBrowser({ k: JSON.stringify({ a: 1 }) }, (data) => {
        const signal = Signal.withLocalStorage({ localStorageKey: 'k', value: { a: 0 }, decoder: z.object({ a: z.number() }) });
        const first = signal.get();
        expect(signal.get()).toBe(first);

        data.k = JSON.stringify({ a: 2 });
        const second = signal.get();
        expect(second).toEqual({ a: 2 });
        expect(second).not.toBe(first);
    });
});

Deno.test('withLocalStorage: observers see set', () => {
    withFakeBrowser({}, () => {
        const signal = stringSignal();
        const seen: string[] = [];
        const dispose = autorun(() => {
            seen.push(signal.get());
        });
        signal.set('a');
        signal.set('b');
        dispose();
        expect(seen).toEqual(['default', 'a', 'b']);
    });
});

Deno.test('withLocalStorage: a storage event for the key updates observers, other keys do not, and it stops after dispose', () => {
    withFakeBrowser({}, (data) => {
        const signal = stringSignal();
        const seen: string[] = [];
        const dispose = autorun(() => {
            seen.push(signal.get());
        });

        data.k = JSON.stringify('from another tab');
        dispatchStorageEvent('k');
        expect(seen).toEqual(['default', 'from another tab']);

        dispatchStorageEvent('unrelated');
        expect(seen.length).toBe(2);

        data.k = JSON.stringify('after clear');
        dispatchStorageEvent(null);
        expect(seen).toEqual(['default', 'from another tab', 'after clear']);

        dispose();
        data.k = JSON.stringify('unobserved');
        dispatchStorageEvent('k');
        expect(seen.length).toBe(3);
    });
});

Deno.test('withLocalStorage: the user onConnect still runs, and its unsubscribe too', () => {
    withFakeBrowser({}, () => {
        let connected = 0;
        let disconnected = 0;
        const signal = Signal.withLocalStorage({
            localStorageKey: 'k',
            value: 'default',
            decoder: z.string(),
            onConnect: () => {
                connected++;
                return () => {
                    disconnected++;
                };
            },
        });
        const dispose = autorun(() => {
            signal.get();
        });
        expect(connected).toBe(1);
        dispose();
        expect(disconnected).toBe(1);
    });
});

Deno.test('withLocalStorage: on a server get returns the default and set is ignored', () => {
    expect(typeof window).toBe('undefined');
    const signal = stringSignal();
    expect(signal.get()).toBe('default');
    signal.set('ignored');
    expect(signal.get()).toBe('default');
});

Deno.test('withSessionStorage reads and writes sessionStorage', () => {
    withFakeBrowser({}, () => {
        const signal = Signal.withSessionStorage({ localStorageKey: 'k', value: 'default', decoder: z.string() });
        expect(signal.get()).toBe('default');
        signal.set('chosen');
        expect(sessionStorage.getItem('k')).toBe(JSON.stringify('chosen'));
        expect(localStorage.getItem('k')).toBe(null);
        expect(signal.get()).toBe('chosen');
    }, { });
});

// A cookie jar behind `document.cookie`: a write is parsed like a browser does (name=value, then attributes).
const withFakeDocument = (
    jar: Record<string, string>,
    run: (jar: Record<string, string>, writes: string[]) => void | Promise<void>,
) => {
    const g = globalThis as Record<string, unknown>;
    const prevDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
    const prevStore = Object.getOwnPropertyDescriptor(globalThis, 'cookieStore');
    const writes: string[] = [];
    Object.defineProperty(globalThis, 'document', {
        configurable: true,
        value: {
            get cookie() {
                return Object.entries(jar).map(([name, value]) => `${name}=${value}`).join('; ');
            },
            set cookie(text: string) {
                writes.push(text);
                const [pair = '', ...attributes] = text.split(';').map((part) => part.trim());
                const separator = pair.indexOf('=');
                const name = pair.slice(0, separator);
                if (attributes.includes('Max-Age=0')) {
                    delete jar[name];
                } else {
                    jar[name] = pair.slice(separator + 1);
                }
            },
        },
    });
    Object.defineProperty(globalThis, 'cookieStore', { configurable: true, value: new EventTarget() });

    const restore = () => {
        for (const [name, prev] of [['document', prevDocument], ['cookieStore', prevStore]] as const) {
            if (prev === undefined) {
                delete g[name];
            } else {
                Object.defineProperty(globalThis, name, prev);
            }
        }
    };

    try {
        const result = run(jar, writes);
        if (result instanceof Promise) {
            return result.finally(restore);
        }
        restore();
    } catch (error) {
        restore();
        throw error;
    }
};

const cookieSignal = () => Signal.withCookie({ cookieName: 'brand', value: 'default', decoder: z.string() });

Deno.test('withCookie: the cookie value is there on the first get', () => {
    withFakeDocument({ brand: encodeURIComponent(JSON.stringify('Spinaker V2')) }, () => {
        expect(cookieSignal().get()).toBe('Spinaker V2');
    });
});

Deno.test('withCookie: finds its cookie among others, and a name that only ends the same does not match', () => {
    withFakeDocument({
        other: '1',
        xbrand: encodeURIComponent(JSON.stringify('wrong')),
        brand: encodeURIComponent(JSON.stringify('right')),
    }, () => {
        expect(cookieSignal().get()).toBe('right');
    });
});

Deno.test('withCookie: the default applies when there is no cookie, or it holds bad JSON, a wrong type or bad escaping', () => {
    withFakeDocument({}, (jar) => {
        const signal = cookieSignal();
        expect(signal.get()).toBe('default');

        jar.brand = encodeURIComponent('{not json');
        expect(signal.get()).toBe('default');

        jar.brand = encodeURIComponent(JSON.stringify(5));
        expect(signal.get()).toBe('default');

        jar.brand = '%E0%A4%A';
        expect(signal.get()).toBe('default');
    });
});

Deno.test('withCookie: set writes the encoded JSON with the default attributes', () => {
    withFakeDocument({}, (jar, writes) => {
        const signal = cookieSignal();
        signal.set('Spinaker V1');

        expect(jar.brand).toBe(encodeURIComponent(JSON.stringify('Spinaker V1')));
        expect(writes).toEqual([`brand=${encodeURIComponent('"Spinaker V1"')}; Path=/; Max-Age=31536000; SameSite=Lax`]);
        expect(signal.get()).toBe('Spinaker V1');
    });
});

Deno.test('withCookie: options change the attributes, and SameSite=None implies Secure', () => {
    withFakeDocument({}, (_jar, writes) => {
        Signal.withCookie({
            cookieName: 'brand',
            value: 'default',
            decoder: z.string(),
            options: { path: '/shop', maxAgeSeconds: 60, sameSite: 'Strict', domain: 'example.com', secure: true },
        }).set('a');
        Signal.withCookie({
            cookieName: 'brand',
            value: 'default',
            decoder: z.string(),
            options: { sameSite: 'None' },
        }).set('b');

        expect(writes[0]).toBe(`brand=${encodeURIComponent('"a"')}; Path=/shop; Max-Age=60; SameSite=Strict; Domain=example.com; Secure`);
        expect(writes[1]).toBe(`brand=${encodeURIComponent('"b"')}; Path=/; Max-Age=31536000; SameSite=None; Secure`);
    });
});

Deno.test('withCookie: a change made behind the signal is read on the next get, and get returns the same object until then', () => {
    withFakeDocument({ brand: encodeURIComponent(JSON.stringify({ a: 1 })) }, (jar) => {
        const signal = Signal.withCookie({ cookieName: 'brand', value: { a: 0 }, decoder: z.object({ a: z.number() }) });
        const first = signal.get();
        expect(signal.get()).toBe(first);

        jar.brand = encodeURIComponent(JSON.stringify({ a: 2 }));
        expect(signal.get()).toEqual({ a: 2 });
        expect(signal.get()).not.toBe(first);

        delete jar.brand;
        expect(signal.get()).toEqual({ a: 0 });
    });
});

Deno.test('withCookie: observers see set, and a cookieStore change while watched', () => {
    withFakeDocument({}, (jar) => {
        const signal = cookieSignal();
        const seen: string[] = [];
        const dispose = autorun(() => {
            seen.push(signal.get());
        });

        signal.set('a');
        jar.brand = encodeURIComponent(JSON.stringify('from elsewhere'));
        (globalThis as unknown as { cookieStore: EventTarget }).cookieStore.dispatchEvent(new Event('change'));
        expect(seen).toEqual(['default', 'a', 'from elsewhere']);

        dispose();
        jar.brand = encodeURIComponent(JSON.stringify('unobserved'));
        (globalThis as unknown as { cookieStore: EventTarget }).cookieStore.dispatchEvent(new Event('change'));
        expect(seen.length).toBe(3);
    });
});

Deno.test('withCookie: the user onConnect still runs, and its unsubscribe too', () => {
    withFakeDocument({}, () => {
        let connected = 0;
        let disconnected = 0;
        const signal = Signal.withCookie({
            cookieName: 'brand',
            value: 'default',
            decoder: z.string(),
            onConnect: () => {
                connected++;
                return () => {
                    disconnected++;
                };
            },
        });
        const dispose = autorun(() => {
            signal.get();
        });
        expect(connected).toBe(1);
        dispose();
        expect(disconnected).toBe(1);
    });
});

Deno.test('withCookie: without a document get returns the default and set is ignored', () => {
    expect(typeof document).toBe('undefined');
    const signal = cookieSignal();
    expect(signal.get()).toBe('default');
    signal.set('ignored');
    expect(signal.get()).toBe('default');
});

Deno.test('withCookie: rejects a cookie name that is not a valid token', () => {
    for (const cookieName of ['', 'a b', 'a;b', 'a=b', 'zażółć']) {
        expect(() => Signal.withCookie({ cookieName, value: 'default', decoder: z.string() })).toThrow();
    }
});
