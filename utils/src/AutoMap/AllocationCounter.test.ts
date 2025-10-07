import { AllocationCounter } from "@reactive/utils";
import { gc } from '../gc.ts';
import { expect } from "jsr:@std/expect";

Deno.test('AllocationCounter', async () => {

    const counter = new AllocationCounter();

    expect(counter.getCounter()).toBe(0);
    counter.up({});
    counter.up({});
    expect(counter.getCounter()).toBe(2);

    await gc();

    expect(counter.getCounter()).toBe(0);
});
