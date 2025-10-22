import { expect } from "jsr:@std/expect";
// import { timeout } from './timeout';
import { Signal } from './Signal.ts';
import { autorun } from 'mobx';
import { timeout } from '../timeout.ts';

Deno.test('basic', () => {
    const value = new Signal<number>(1);
    expect(value.get()).toBe(1);
    value.set(444);
    expect(value.get()).toBe(444);
});

Deno.test('observed', () => {
    const value = new Signal<number>(1);

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
    let set: ((value: number) => void) = () => {};

    const value = new Signal(1, (setValue) => {
        set = setValue;
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

    set(55);

    expect(connect).toBe(true);
    expect(value.get()).toBe(55);

    set(99);

    expect(connect).toBe(true);
    expect(value.get()).toBe(99);

    dispose();

    expect(connect).toBe(false);
    expect(value.get()).toBe(99);
});

Deno.test('withKeepAlive', async () => {
    let connectCount: number = 0;
    let connect: boolean = false;
    let set: ((value: number) => void) = () => {};

    const value = Signal.withKeepAlive(200, 1, (setValue) => {
        connectCount++;
        set = setValue;
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

    set(55);

    expect(connect).toBe(true);
    expect(value.get()).toBe(55);

    set(99);

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