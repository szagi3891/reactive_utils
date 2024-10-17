import { expect } from "jsr:@std/expect";
import { Resource } from './Resource.ts';
import { timeout } from './timeout.ts';

Deno.test('refresh on an uninitialized resource should not send any request', async () => {
    let execCounter: number = 0;

    const inst = Resource.browserAndServer<number>(async () => {
        const value = execCounter;
        execCounter++;

        await timeout(200);
        return value;
    });

    const refresh1 = inst.refresh();
    const refresh2 = inst.refresh();

    await timeout(1000);

    await refresh1;
    await refresh2;
 
    expect(execCounter).toBe(0);
});

Deno.test('refresh on initialized resource should send one request', async () => {
    let execCounter: number = 0;

    const inst = Resource.browserAndServer<number>(async () => {
        const value = execCounter;
        execCounter++;

        await timeout(200);
        return value;
    });

    await inst.refresh();
    await inst.refresh();
    await inst.refresh();
    expect(execCounter).toBe(0);

    //init resource
    inst.get();
    await timeout(100);

    const refresh1 = inst.refresh();
    const refresh2 = inst.refresh();

    await timeout(500);

    await refresh1;
    await refresh2;

    expect(execCounter).toBe(1);

    const refresh3 = inst.refresh();
    await timeout(50);
    const refresh4 = inst.refresh();
    await timeout(50);
    const refresh5 = inst.refresh();
    await timeout(50);
    const refresh6 = inst.refresh();

    await refresh3;
    await refresh4;
    await refresh5;
    await refresh6;

    expect(execCounter).toBe(2);

    await inst.refresh();
    expect(execCounter).toBe(3);

    await inst.refresh();
    expect(execCounter).toBe(4);

    await inst.refresh();
    expect(execCounter).toBe(5);
});

Deno.test('error catch', async () => {
    let execCounter: number = 0;

    const inst = Resource.browserAndServer<number>(async () => {
        const value = execCounter;
        execCounter++;

        if (value === 2) {
            throw Error('fail fetch data');
        }

        await timeout(100);
        return value;
    });

    inst.getReady();
    
    expect(execCounter).toBe(0);
    await timeout(0);

    //exec in next tick
    expect(execCounter).toBe(1);

    await timeout(200);

    expect(inst.getReady()).toBe(0);

    await inst.refresh();

    expect(inst.getReady()).toBe(1);

    await inst.refresh();
    expect(inst.get()).toEqual({ type: 'error', message: 'Error: fail fetch data'});

    await inst.refresh();
    expect(inst.getReady()).toBe(3);
});