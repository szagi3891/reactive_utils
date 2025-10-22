import { Signal } from './Signal.ts';
import { Computed } from './Computed.ts';
import { autorun } from 'mobx';
import { expect } from "jsr:@std/expect";

Deno.test('ComputedStruct', () => {
    const sourceValue = new Signal<Array<{name: string}>>([]);

    const computed = Computed.initStructural(() => {
        return sourceValue.getValue();
    });

    let counter: number = 0;

    const dispose = autorun(() => {
        counter++;

        computed.getValue();
    });

    expect(counter).toBe(1);
    sourceValue.setValue([]);
    expect(counter).toBe(1);

    sourceValue.setValue([{ name: 'aaa' }]);
    expect(counter).toBe(2);
    sourceValue.setValue([{ name: 'aaa' }]);
    expect(counter).toBe(2);

    sourceValue.setValue([{ name: 'aaa' }, { name: 'bbb'}]);
    expect(counter).toBe(3);
    sourceValue.setValue([{ name: 'aaa' }, { name: 'bbb'}]);
    expect(counter).toBe(3);

    dispose();
});

