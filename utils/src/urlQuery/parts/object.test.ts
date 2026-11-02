import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { INVALID, type InputOf, type ValueOf } from "../part.ts";
import { expectType, readK, writeK, type Equal } from "../testing.ts";
import { int } from "./int.ts";
import { object } from "./object.ts";
import { text } from "./text.ts";

describe("object", () => {
  const listing = object({ category: text, page: int.optional() });

  it("reads each field under its key, nested in the object's key", () => {
    assert.deepEqual(readK(listing, "k-category=brakes&k-page=2"), { category: "brakes", page: 2 });
  });

  it("writes each field under its key, nested in the object's key", () => {
    assert.equal(writeK(listing, { category: "brakes", page: 2 }), "k-category=brakes&k-page=2");
  });

  it("leaves out a field read as undefined", () => {
    assert.deepEqual(readK(listing, "k-category=brakes&k-page=x"), { category: "brakes" });
  });

  it("reads as invalid when a field is", () => {
    assert.equal(readK(listing, "k-page=2"), INVALID);
  });

  it("nests an object in an object", () => {
    const filter = object({ price: object({ min: int, max: int.optional() }) });

    assert.equal(writeK(filter, { price: { min: 10 } }), "k-price-min=10");
    assert.deepEqual(readK(filter, "k-price-min=10"), { price: { min: 10 } });
  });

  it("is required when a field is", () => {
    assert.equal(listing.required, true);
    assert.equal(object({ page: int.optional() }).required, false);
  });

  it("reads a key such as __proto__ as plain data", () => {
    assert.deepEqual(readK(object({ name: text }), "k-__proto__-name=x&k-name=Ann"), { name: "Ann" });
    assert.equal(Object.hasOwn(Object.prototype, "name"), false);
  });

  it("types a field that can be undefined as an optional key", () => {
    expectType<Equal<ValueOf<typeof listing>, { category: string; page?: number | undefined }>>();
  });

  it("reads a field with a default filled in, and writes it left out if need be", () => {
    const paged = object({ category: text, page: int.default(1) });

    expectType<Equal<ValueOf<typeof paged>, { category: string; page: number }>>();
    expectType<Equal<InputOf<typeof paged>, { category: string; page?: number | undefined }>>();
    assert.equal(writeK(paged, { category: "brakes" }), "k-category=brakes");
    assert.deepEqual(readK(paged, writeK(paged, { category: "brakes" })), { category: "brakes", page: 1 });
  });

  it("can be left out as a whole when it needs no value, writing nothing, so it reads as its fields do without one", () => {
    const filter = object({ brand: text, price: object({ min: int.optional(), max: int.optional() }) });

    expectType<Equal<InputOf<typeof filter>, { brand: string; price?: { min?: number | undefined; max?: number | undefined } | undefined }>>();
    expectType<Equal<ValueOf<typeof filter>, { brand: string; price: { min?: number | undefined; max?: number | undefined } }>>();
    assert.equal(writeK(filter, { brand: "bosch" }), "k-brand=bosch");
    assert.deepEqual(readK(filter, writeK(filter, { brand: "bosch" })), { brand: "bosch", price: {} });
  });

  it("cannot be left out when it needs a value", () => {
    expectType<Equal<InputOf<typeof listing>, { category: string; page?: number | undefined }>>();
  });

  it("reads undefined in place of an optional one the address holds no value it needs of, or holds one wrong", () => {
    const filter = object({ order: object({ by: text, page: int }).optional() });

    expectType<Equal<ValueOf<typeof filter>, { order?: { by: string; page: number } | undefined }>>();
    expectType<Equal<InputOf<typeof filter>, { order?: { by: string; page: number } | undefined } | undefined>>();
    assert.deepEqual(readK(filter, "k-order-by=name&k-order-page=2"), { order: { by: "name", page: 2 } });
    assert.deepEqual(readK(filter, "k-order-by=name"), {});
    assert.deepEqual(readK(filter, "k-order-by=name&k-order-page=x"), {});
    assert.deepEqual(readK(filter, ""), {});
    assert.equal(object({ order: object({ by: text }).optional() }).required, false);
  });

  it("writes an optional one, and nothing for undefined, so it reads back the same", () => {
    const filter = object({ order: object({ by: text, page: int }).optional() });

    assert.equal(writeK(filter, { order: { by: "name", page: 2 } }), "k-order-by=name&k-order-page=2");
    assert.equal(writeK(filter, {}), "");
    assert.deepEqual(readK(filter, writeK(filter, { order: { by: "name", page: 2 } })), { order: { by: "name", page: 2 } });
  });

  it("does not type-check a key holding a hyphen", () => {
    // @ts-expect-error A hyphen would read as a nested key.
    object({ "search-box": text });
  });
});
