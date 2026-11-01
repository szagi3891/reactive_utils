import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { INVALID } from "../part.ts";
import { cannotHold, readK, reported, writeK } from "../testing.ts";
import { number } from "./number.ts";

describe("number", () => {
  it("reads a number as String() writes it", () => {
    assert.equal(readK(number, "k=19.99"), 19.99);
    assert.equal(readK(number, "k=-1.5e%2B300"), -1.5e300);
    assert.equal(readK(number, "k=1e-7"), 1e-7);
  });

  it("reads anything else as invalid", () => {
    for (const written of ["abc", "1,5", ".5", "Infinity", "NaN"]) {
      assert.equal(readK(number, `k=${written}`), INVALID, written);
    }
  });

  it("reads back any finite number it writes", () => {
    for (const value of [0, 20, 19.99, -0.1, 1e-7, 5e-324, -1.5e300, Number.MAX_VALUE]) {
      assert.equal(readK(number, writeK(number, value)), value);
    }
  });

  it("leaves out a number that is not finite, reporting it", () => {
    for (const value of [Number.NaN, Infinity, -Infinity]) {
      assert.deepEqual(reported(() => writeK(number, value)), { result: "", errors: [cannotHold("k", "a finite number", String(value), "nothing is written, so the whole query reads as null")] }, String(value));
    }
  });
});
