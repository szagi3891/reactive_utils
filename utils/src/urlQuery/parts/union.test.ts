import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { INVALID, type InputOf, type ValueOf } from "../part.ts";
import { expectType, readK, writeK, type Equal } from "../testing.ts";
import { int } from "./int.ts";
import { object } from "./object.ts";
import { text } from "./text.ts";
import { union } from "./union.ts";

describe("union", () => {
  const vehicle = union("by", {
    model: object({ brand: int, engine: int.optional() }),
    kba: object({ kba: text }),
  });

  it("reads the variant its tag names, with that variant's values", () => {
    assert.deepEqual(readK(vehicle, "k-by=model&k-brand=184"), { by: "model", brand: 184 });
    assert.deepEqual(readK(vehicle, "k-by=kba&k-kba=0603BJS&k-brand=184"), { by: "kba", kba: "0603BJS" });
  });

  it("reads as invalid for an unknown tag, or without the values of its variant", () => {
    assert.equal(readK(vehicle, "k-by=vin"), INVALID);
    assert.equal(readK(vehicle, "k-by=toString"), INVALID);
    assert.equal(readK(vehicle, "k-by=kba"), INVALID);
    assert.equal(readK(vehicle, "k-kba=0603BJS"), INVALID);
  });

  it("writes the tag, then the variant's values", () => {
    assert.equal(writeK(vehicle, { by: "model", brand: 184, engine: 7 }), "k-by=model&k-brand=184&k-engine=7");
    assert.equal(writeK(vehicle, { by: "kba", kba: "0603BJS" }), "k-by=kba&k-kba=0603BJS");
  });

  it("reads each variant's defaults filled in, and writes them left out if need be", () => {
    const paged = union("by", { model: object({ brand: int, page: int.default(1) }), kba: object({ kba: text }) });

    expectType<Equal<ValueOf<typeof paged>, { by: "model"; brand: number; page: number } | { by: "kba"; kba: string }>>();
    expectType<Equal<InputOf<typeof paged>, { by: "model"; brand: number; page?: number | undefined } | { by: "kba"; kba: string }>>();
    assert.deepEqual(readK(paged, writeK(paged, { by: "model", brand: 184 })), { by: "model", brand: 184, page: 1 });
  });

  it("types the values of each variant", () => {
    expectType<Equal<
      ValueOf<typeof vehicle>,
      { by: "model"; brand: number; engine?: number | undefined } | { by: "kba"; kba: string }
    >>();
  });

  it("does not take a variant holding the tag as a key", () => {
    assert.throws(() => union("by", { model: object({ by: text }) }));
  });

  it("reads back a variant of an empty name", () => {
    const named = union("by", { "": object({ name: text }), a: object({}) });

    assert.equal(writeK(named, { by: "", name: "x" }), "k-by=&k-name=x");
    assert.deepEqual(readK(named, "k-by=&k-name=x"), { by: "", name: "x" });
  });

  it("does not type-check a tag holding a hyphen", () => {
    // @ts-expect-error A hyphen would read as a nested key.
    union("by-what", { a: object({ name: text }) });
  });
});
