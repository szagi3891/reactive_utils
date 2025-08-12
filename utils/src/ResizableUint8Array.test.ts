import { expect } from "jsr:@std/expect";
import { ResizableUint8Array } from "./ResizableUint8Array.ts";
import { assertThrows } from "jsr:@std/assert";

Deno.test('ResizableUint8Array', () => {

    const buf = new ResizableUint8Array();

    expect(buf.length).toEqual(0);

    buf.push(1);
    buf.push(2);
    buf.push(3);
    buf.push(4);

    expect(buf.length).toEqual(4);

    const buffer = new Uint8Array([1, 2, 3, 4]);

    expect(buf.toUint8Array()).toEqual(buffer);

    buf.pushBytes(new Uint8Array([7,8,9]));

    expect(buf.toUint8Array()).toEqual(new Uint8Array([1, 2, 3, 4, 7, 8, 9]));

    assertThrows(
        () => {
            buf.push(333);
        },
        Error,
        'Nieprawidłowy zakres 333'
    );
});

