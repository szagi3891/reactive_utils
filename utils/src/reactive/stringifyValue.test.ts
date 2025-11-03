import { stringifyValue } from "./stringifyValue.ts";
import { expect } from "jsr:@std/expect";

Deno.test('stringifyValue', () => {

    expect(stringifyValue([])).toBe('val-[]');
});

