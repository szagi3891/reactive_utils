import { expect } from "jsr:@std/expect";
import { EventEmitter } from "./EventEmitter.ts";

Deno.test('basic', () => {

    let currentSize: number = 0;

    const emitter = new EventEmitter((size: number) => {
        currentSize = size;
    });

    expect(currentSize).toBe(0);

    const sub1 = emitter.on(() => {});

    expect(currentSize).toBe(1);

    const sub2 = emitter.on(() => {});

    expect(currentSize).toBe(2);

    sub2();
    expect(currentSize).toBe(1);

    const sub3 = emitter.on(() => {});
    expect(currentSize).toBe(2);

    sub1();

    expect(currentSize).toBe(1);

    sub1();
    sub1();
    sub1();

    expect(currentSize).toBe(1);

    sub3();
    expect(currentSize).toBe(0);
});

