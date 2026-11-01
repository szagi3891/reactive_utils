import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cannotHold, readK, reported, writeK } from "../testing.ts";
import { int } from "./int.ts";
import { list } from "./list.ts";
import { text } from "./text.ts";

describe("list", () => {
  const brands = list(text);

  it("reads every value of its key, in order", () => {
    assert.deepEqual(readK(brands, "k=b&x=1&k=a"), ["b", "a"]);
    assert.deepEqual(readK(brands, "k=a"), ["a"]);
  });

  it("reads no values for a missing key, and blank ones as its item reads them", () => {
    assert.deepEqual(readK(brands, ""), []);
    assert.deepEqual(readK(brands, "k=&k=%20"), ["", " "]);
    assert.deepEqual(readK(list(int), "k=&k=%20"), []);
  });

  it("leaves out the values its item cannot read, keeping the others", () => {
    assert.deepEqual(readK(list(int), "k=1&k=x&k=y&k=2"), [1, 2]);
  });

  it("writes its key once per value, and nothing for no values", () => {
    assert.equal(writeK(brands, ["a", "b"]), "k=a&k=b");
    assert.equal(writeK(brands, []), "");
    assert.equal(writeK(brands, undefined), "");
  });

  it("reads back the values it writes, repeated and blank ones included", () => {
    const values = ["a", "b", "a", " c ", "", " "];

    assert.deepEqual(readK(brands, writeK(brands, values)), values);
  });

  it("leaves out a value its item cannot write, reporting it, and keeps the others", () => {
    const ids = list(int);
    const { result, errors } = reported(() => writeK(ids, [1, 1.5, 2]));

    assert.deepEqual(readK(ids, result), [1, 2]);
    assert.deepEqual(errors, [cannotHold("k", "a whole number between -(2^53 - 1) and 2^53 - 1", "1.5", "it is left out of the list")]);
  });
});
