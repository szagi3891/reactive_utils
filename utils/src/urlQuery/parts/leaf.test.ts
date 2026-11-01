import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { INVALID } from "../part.ts";
import { cannotHold, readK, reported, writeK } from "../testing.ts";
import { leaf } from "./leaf.ts";

describe("leaf", () => {
  // Reads any letters, lowercased, so an uppercase value does not read back the same.
  const word = leaf({
    expected: "letters in lowercase",
    parse: (written) => (/^[a-z]+$/i.test(written) ? written.toLowerCase() : undefined),
    format: (value) => value,
  });

  it("reads the first value of its key", () => {
    assert.equal(readK(word, "k=abc&k=def"), "abc");
  });

  it("reads a missing value, or one it cannot parse, as invalid", () => {
    assert.equal(readK(word, ""), INVALID);
    assert.equal(readK(word, "k=a1"), INVALID);
    assert.equal(readK(word, "k=a1&k=abc"), INVALID);
  });

  it("writes a value that reads back the same", () => {
    assert.equal(writeK(word, "abc"), "k=abc");
  });

  it("leaves a blank value to its parse, which reads it as invalid here", () => {
    assert.equal(readK(word, "k="), INVALID);
    assert.equal(readK(word, "k=&k=abc"), INVALID);
  });

  it("leaves out a value that would read back different, reporting it, so it reads as missing", () => {
    for (const value of ["ABC", "a1", ""]) {
      assert.deepEqual(reported(() => writeK(word, value)), { result: "", errors: [cannotHold("k", "letters in lowercase", JSON.stringify(value), "nothing is written, so the whole query reads as null")] });
    }
  });

  describe("optional", () => {
    const optional = word.optional();

    it("reads a missing or wrong value as undefined", () => {
      assert.equal(readK(optional, ""), undefined);
      assert.equal(readK(optional, "k=a1"), undefined);
      assert.equal(readK(optional, "k=abc"), "abc");
    });

    it("writes nothing for undefined", () => {
      assert.equal(writeK(optional, undefined), "");
      assert.equal(writeK(optional, "abc"), "k=abc");
    });

    it("writes a value it cannot hold as undefined, reporting it", () => {
      const { result, errors } = reported(() => writeK(optional, "ABC"));

      assert.equal(readK(optional, result), undefined);
      assert.deepEqual(errors, [cannotHold("k", "letters in lowercase", '"ABC"', "nothing is written, so it reads as undefined")]);
    });
  });

  describe("default", () => {
    const withDefault = word.default("none");

    it("reads a missing or wrong value as the fallback", () => {
      assert.equal(readK(withDefault, ""), "none");
      assert.equal(readK(withDefault, "k=a1"), "none");
      assert.equal(readK(withDefault, "k=abc"), "abc");
    });

    it("leaves the fallback out of the address, even one it could not write", () => {
      assert.equal(writeK(withDefault, "none"), "");
      assert.equal(writeK(word.default("NONE"), "NONE"), "");
      assert.equal(writeK(withDefault, "abc"), "k=abc");
    });

    it("writes nothing for undefined, so a value can be left out to read as the fallback", () => {
      assert.equal(writeK(withDefault, undefined), "");
      assert.equal(readK(withDefault, writeK(withDefault, undefined)), "none");
    });

    it("writes a value it cannot hold as the fallback, reporting it", () => {
      const { result, errors } = reported(() => writeK(withDefault, "ABC"));

      assert.equal(readK(withDefault, result), "none");
      assert.deepEqual(errors, [cannotHold("k", "letters in lowercase", '"ABC"', 'nothing is written, so it reads as its default "none"')]);
    });
  });
});
