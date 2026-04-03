import { Signal } from './Signal.ts';
import { Computed } from './Computed.ts';
import { autorun } from 'mobx';
import { expect } from "jsr:@std/expect";
import { timeout } from "../timeout.ts";

Deno.test('ComputedStruct', () => {
    const sourceValue = Signal.create<Array<{ name: string }>>([]);

    const computed = Computed.initStructural(() => {
        return sourceValue.get();
    });

    let counter: number = 0;

    const dispose = autorun(() => {
        counter++;

        computed.get();
    });

    expect(counter).toBe(1);
    sourceValue.set([]);
    expect(counter).toBe(1);

    sourceValue.set([{ name: 'aaa' }]);
    expect(counter).toBe(2);
    sourceValue.set([{ name: 'aaa' }]);
    expect(counter).toBe(2);

    sourceValue.set([{ name: 'aaa' }, { name: 'bbb'}]);
    expect(counter).toBe(3);
    sourceValue.set([{ name: 'aaa' }, { name: 'bbb'}]);
    expect(counter).toBe(3);

    dispose();
});


Deno.test('createPollingSync syncs from source while observed', async () => {
    const source = { n: 1 };
    const signal = Computed.withPollingSync(50, () => source.n);
    let seen = 0;
    const dispose = autorun(() => {
        seen = signal.get();
    });
    expect(seen).toBe(1);
    source.n = 2;
    await timeout(60);
    expect(seen).toBe(2);
    dispose();
});
