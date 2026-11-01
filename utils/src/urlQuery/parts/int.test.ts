import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { INVALID } from "../part.ts";
import { cannotHold, readK, reported, writeK } from "../testing.ts";
import { int } from "./int.ts";

describe("int", () => {
  it("reads a whole number written in decimal", () => {
    assert.equal(readK(int, "k=42"), 42);
    assert.equal(readK(int, "k=-7"), -7);
  });

  it("reads anything else as invalid", () => {
    for (const written of ["1.5", "1e3", "0x10", "two", "9007199254740993"]) {
      assert.equal(readK(int, `k=${written}`), INVALID, written);
    }
  });

  it("reads back any safe integer it writes", () => {
    for (const value of [0, 1, -42, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER]) {
      assert.equal(readK(int, writeK(int, value)), value);
    }
  });

  it("leaves out a number that is not a safe integer, reporting it", () => {
    for (const value of [1.5, 2 ** 60, Number.NaN]) {
      assert.deepEqual(reported(() => writeK(int, value)), { result: "", errors: [cannotHold("k", "a whole number between -(2^53 - 1) and 2^53 - 1", String(value), "nothing is written, so the whole query reads as null")] }, String(value));
    }
  });
});
