import { expect, test } from 'vitest';
// import { timeout } from './timeout';
import { Value } from './Value';
import { autorun } from 'mobx';
import { timeout } from './timeout';

test('basic', async () => {
    const value = new Value<number>(1);
    expect(value.getValue()).toBe(1);
    value.setValue(444);
    expect(value.getValue()).toBe(444);
});

test('observed', async () => {
    const value = new Value<number>(1);

    expect(value.isObserved()).toBe(false);
    const dispose = autorun(() => {
        value.getValue();
    });

    expect(value.isObserved()).toBe(true);

    dispose();
    expect(value.isObserved()).toBe(false);
});

test('connect', () => {
    let connect: boolean = false;
    let set: ((value: number) => void) = () => {};

    const value = new Value(1, (setValue) => {
        set = setValue;
        connect = true;

        return () => {
            connect = false;
        };
    });

    expect(connect).toBe(false);
    expect(value.getValue()).toBe(1);

    const dispose = autorun(() => {
        value.getValue();
    });

    expect(connect).toBe(true);
    expect(value.getValue()).toBe(1);

    set(55);

    expect(connect).toBe(true);
    expect(value.getValue()).toBe(55);

    set(99);

    expect(connect).toBe(true);
    expect(value.getValue()).toBe(99);

    dispose();

    expect(connect).toBe(false);
    expect(value.getValue()).toBe(99);
});

test('withKeepAlive', async () => {
    let connectCount: number = 0;
    let connect: boolean = false;
    let set: ((value: number) => void) = () => {};

    const value = Value.withKeepAlive(200, 1, (setValue) => {
        connectCount++;
        set = setValue;
        connect = true;

        return () => {
            connect = false;
        };
    });

    expect(connectCount).toBe(0);
    expect(connect).toBe(false);
    expect(value.getValue()).toBe(1);

    const dispose = autorun(() => {
        value.getValue();
    });

    expect(connectCount).toBe(1);
    expect(connect).toBe(true);
    expect(value.getValue()).toBe(1);

    set(55);

    expect(connect).toBe(true);
    expect(value.getValue()).toBe(55);

    set(99);

    expect(connectCount).toBe(1);
    expect(connect).toBe(true);
    expect(value.getValue()).toBe(99);

    dispose();

    expect(connectCount).toBe(1);
    expect(connect).toBe(true);
    expect(value.getValue()).toBe(99);

    await timeout(100);
    expect(connect).toBe(true);

    await timeout(50);
    expect(connect).toBe(true);

    await timeout(100);
    expect(connect).toBe(false);

    //subscription deactivated 

    expect(connectCount).toBe(1);
    const dispose2 = autorun(() => {
        value.getValue();
    });

    expect(connectCount).toBe(2);
    expect(connect).toBe(true);
    dispose2();

    await timeout(100);

    const dispose3 = autorun(() => {
        value.getValue();
    });

    expect(connect).toBe(true);

    await timeout(300);

    expect(connectCount).toBe(2);
    expect(connect).toBe(true);

    dispose3();
});