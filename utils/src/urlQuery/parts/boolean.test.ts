import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { INVALID } from "../part.ts";
import { readK, writeK } from "../testing.ts";
import { boolean } from "./boolean.ts";

describe("boolean", () => {
  it("reads true and false", () => {
    assert.equal(readK(boolean, "k=true"), true);
    assert.equal(readK(boolean, "k=false"), false);
  });

  it("reads true and false in any case", () => {
    assert.equal(readK(boolean, "k=TRUE"), true);
    assert.equal(readK(boolean, "k=True"), true);
    assert.equal(readK(boolean, "k=fAlSe"), false);
  });

  it("reads anything else as invalid", () => {
    for (const written of ["1", "0", "yes", "on", "truth", "%20true"]) {
      assert.equal(readK(boolean, `k=${written}`), INVALID, written);
    }
  });

  it("writes true and false in lowercase", () => {
    assert.equal(writeK(boolean, true), "k=true");
    assert.equal(writeK(boolean, false), "k=false");
  });
});
