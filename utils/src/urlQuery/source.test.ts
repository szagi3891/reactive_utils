import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { paramsOf } from "./source.ts";

describe("paramsOf", () => {
  const expected = new Map([["a", ["1", "3"]], ["b", ["2"]]]);

  it("reads the same params from a search string, a URLSearchParams and a page's search params", () => {
    assert.deepEqual(paramsOf("?a=1&b=2&a=3"), expected);
    assert.deepEqual(paramsOf(new URLSearchParams("a=1&b=2&a=3")), expected);
    assert.deepEqual(paramsOf({ a: ["1", "3"], b: "2", c: undefined }), expected);
  });

  it("keeps the blank values", () => {
    assert.deepEqual(paramsOf("a=&b=%20&a"), new Map([["a", ["", ""]], ["b", [" "]]]));
  });
});
