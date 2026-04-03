import { expect } from "jsr:@std/expect";
import { Signal } from './Signal.ts';
import { autorun } from 'mobx';
import { timeout } from '../timeout.ts';

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