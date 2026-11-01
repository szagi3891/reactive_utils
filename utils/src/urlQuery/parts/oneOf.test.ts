import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { INVALID } from "../part.ts";
import { expectType, readK, writeK, type Equal } from "../testing.ts";
import { oneOf } from "./oneOf.ts";

describe("oneOf", () => {
  const view = oneOf(["tree", "products"]);

  it("reads one of its words", () => {
    assert.equal(readK(view, "k=tree"), "tree");
    assert.equal(readK(view, "k=products"), "products");
  });

  it("reads any other word as invalid", () => {
    for (const written of ["map", "Tree", "toString"]) {
      assert.equal(readK(view, `k=${written}`), INVALID, written);
    }
  });

  it("writes its words", () => {
    assert.equal(writeK(view, "products"), "k=products");
  });

  it("reads a blank value as invalid, unless an empty word is one of its words", () => {
    assert.equal(readK(view, "k="), INVALID);
    assert.equal(readK(oneOf(["", "a"]), writeK(oneOf(["", "a"]), "")), "");
  });

  it("types its words", () => {
    expectType<Equal<ReturnType<typeof view.parse>, "tree" | "products" | undefined>>();
  });
});
