import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { param, route, urlQuery, type QueryInputOf, type QueryOf, type UrlQuery } from "./index.ts";
import { cannotHold, expectType, reported, type Equal } from "./testing.ts";

it('basic route', () => {

  const ListingQuery2 = urlQuery(param.object({
    category: param.text,
    page: param.int.default(1),
  })).default({
    category: 'aaa',
    page: 1,
  });


  const route2 = route('/podstrona/:id/:page', {
    params: {
      id: param.number,
      page: param.text
    },
    query: ListingQuery2
  });


  const aaaa = route2.href({
    params: {
      id: 1.2,
      page: '322'
    },
    query: {
      category: '32232'
    }
  });

  // A number holds a fraction, so 1.2 is written and read back as it is.
  assert.equal(aaaa, '/podstrona/1.2/322?category=32232');
  assert.deepEqual(route2.read({ params: { id: '1.2', page: '322' }, query: 'category=32232' }), {
    params: { id: 1.2, page: '322' },
    query: { category: '32232', page: 1 },
  });

  // An int does not: in the path 1.2 is written anyway, as a path cannot leave a segment out, and reported.
  const route3 = route('/podstrona/:id', { params: { id: param.int } });
  const inPath = reported(() => route3.href({ params: { id: 1.2 } }));

  assert.equal(inPath.result, '/podstrona/1.2');
  assert.deepEqual(inPath.errors, [
    ['urlQuery: path param "id" expects a whole number between -(2^53 - 1) and 2^53 - 1, got 1.2; it is written anyway, so the address does not read back the same.'],
  ]);
  // So the address reads as no route.
  assert.equal(route3.read({ params: { id: '1.2' } }), null);

  // In the query 1.2 is left out, and reported, so it reads as its default.
  const inQuery = reported(() => route2.href({ params: { id: 1.2, page: '322' }, query: { category: '32232', page: 1.2 } }));

  assert.equal(inQuery.result, '/podstrona/1.2/322?category=32232');
  assert.deepEqual(inQuery.errors, [
    cannotHold('page', 'a whole number between -(2^53 - 1) and 2^53 - 1', '1.2', 'nothing is written, so it reads as its default 1'),
  ]);
  assert.deepEqual(route2.read({ params: { id: '1.2', page: '322' }, query: 'category=32232&page=1.2' })?.query, { category: '32232', page: 1 });
});

it('basic', () => {

  const ListingQuery2 = urlQuery(param.object({
    category: param.text,
    page: param.int.default(1),
  })).default({
    category: 'aaa',
    page: 1,
  });


  const d2 = ListingQuery2.read('');
  assert.deepEqual(d2, {
    category: 'aaa',
    page: 1,
  });

  const ser = ListingQuery2.write({
    category: 'plastiki',
  });

  assert.deepEqual(ser, 'category=plastiki');

  assert.deepEqual(ListingQuery2.read(ser), {
    category: 'plastiki',
    page: 1,
  });
});

it('union', () => {

  // The tag `by` names the variant; each variant has its own values.
  const VehicleQuery = urlQuery(param.union('by', {
    model: param.object({
      brand: param.int,
      page: param.int.default(1),
    }),
    kba: param.object({
      kba: param.text,
    }),
  }));

  // Writing: the tag first, then the values of its variant; a default left out.
  assert.equal(VehicleQuery.write({ by: 'model', brand: 184 }), 'by=model&brand=184');
  assert.equal(VehicleQuery.write({ by: 'kba', kba: '0603BJS' }), 'by=kba&kba=0603BJS');

  // Reading: the variant the tag names, defaults filled in; values of other variants ignored.
  assert.deepEqual(VehicleQuery.read('by=model&brand=184'), { by: 'model', brand: 184, page: 1 });
  assert.deepEqual(VehicleQuery.read('by=kba&kba=0603BJS&brand=184'), { by: 'kba', kba: '0603BJS' });

  // No query for an unknown tag, a missing one, or a variant without its required value.
  assert.equal(VehicleQuery.read('by=vin'), null);
  assert.equal(VehicleQuery.read('brand=184'), null);
  assert.equal(VehicleQuery.read('by=kba'), null);


  // The value narrows by its tag, as any TypeScript union does.
  const vehicle = VehicleQuery.read('by=model&brand=184&page=3');
  if (vehicle?.by === 'model') {
    assert.equal(vehicle.brand + vehicle.page, 187);
  } else {
    assert.fail('expected the model variant');
  }

  // With a default, an address without a vehicle reads as the fallback.
  const WithDefault = VehicleQuery.default({ by: 'kba', kba: 'none' });
  assert.deepEqual(WithDefault.read(''), { by: 'kba', kba: 'none' });
});

describe("urlQuery", () => {

  const ListingQuery = urlQuery(param.object({
    category: param.text,
    page: param.int.optional(),
  }));

  it("reads the query from a search string, a URLSearchParams or a page's search params", () => {
    const expected = { category: "brakes", page: 2 };

    assert.deepEqual(ListingQuery.read("?category=brakes&page=2"), expected);
    assert.deepEqual(ListingQuery.read(new URLSearchParams("category=brakes&page=2")), expected);
    assert.deepEqual(ListingQuery.read({ category: "brakes", page: "2" }), expected);
  });

  it("reads null without a required value", () => {
    assert.equal(ListingQuery.read("page=2"), null);
  });

  it("writes the search string, and the path with it", () => {
    assert.equal(ListingQuery.write({ category: "brake pads", page: 2 }), "category=brake+pads&page=2");
    assert.equal(ListingQuery.href("/list", { category: "brakes" }), "/list?category=brakes");
  });

  describe("input and output", () => {
    const PagedQuery = urlQuery(param.object({
      category: param.text,
      page: param.int.default(1),
    })).default({ category: "aaa", page: 1 });

    it("reads the values, defaults filled in", () => {
      assert.deepEqual(PagedQuery.read(""), { category: "aaa", page: 1 });
      assert.deepEqual(PagedQuery.read("category=plastiki"), { category: "plastiki", page: 1 });
    });

    it("writes the values, a value with a default left out", () => {
      assert.equal(PagedQuery.write({ category: "plastiki" }), "category=plastiki");
      assert.equal(PagedQuery.write({ category: "plastiki", page: 1 }), "category=plastiki");
      assert.equal(PagedQuery.write({ category: "plastiki", page: 2 }), "category=plastiki&page=2");
    });

    it("reads back what it writes, defaults filled in", () => {
      assert.deepEqual(PagedQuery.read(PagedQuery.write({ category: "plastiki" })), { category: "plastiki", page: 1 });
    });

    it("types the output, which read gives, and the input, which write takes", () => {
      expectType<Equal<QueryOf<typeof PagedQuery>, { category: string; page: number }>>();
      expectType<Equal<QueryInputOf<typeof PagedQuery>, { category: string; page?: number | undefined }>>();
      expectType<Equal<typeof PagedQuery, UrlQuery<{ category: string; page: number }, { category: string; page?: number | undefined }>>>();
    });
  });

  it("writes the path alone for a query with nothing to write", () => {
    const TabQuery = urlQuery(param.object({ tab: param.oneOf(["list", "grid"]).default("list") }));

    assert.equal(TabQuery.href("/list", { tab: "list" }), "/list");
  });

  it("types read with null only for a query with a required value", () => {
    const TabQuery = urlQuery(param.object({ tab: param.oneOf(["list", "grid"]).default("list") }));

    expectType<Equal<ReturnType<typeof ListingQuery.read>, { category: string; page?: number | undefined } | null>>();
    expectType<Equal<ReturnType<typeof TabQuery.read>, { tab: "list" | "grid" }>>();
  });

  describe("default", () => {
    const WithDefault = ListingQuery.default({ category: "all" });

    it("reads the fallback in place of null", () => {
      assert.deepEqual(WithDefault.read("page=2"), { category: "all" });
      assert.deepEqual(WithDefault.read(""), { category: "all" });
    });

    it("reads and writes any other query as the query it is made of", () => {
      assert.deepEqual(WithDefault.read("category=brakes&page=2"), { category: "brakes", page: 2 });
      assert.equal(WithDefault.write({ category: "brakes", page: 2 }), "category=brakes&page=2");
    });

    it("types read without null", () => {
      expectType<Equal<ReturnType<typeof WithDefault.read>, { category: string; page?: number | undefined }>>();
    });

    it("types the query by what read gives, null dropped", () => {
      type Listing = { category: string; page?: number | undefined };

      expectType<Equal<typeof ListingQuery, UrlQuery<Listing | null>>>();
      expectType<Equal<typeof WithDefault, UrlQuery<Listing>>>();
    });

    it("nests as a part that is not required, so reads the fallback there too", () => {
      const Query = urlQuery(param.object({ listing: WithDefault.part, view: param.oneOf(["tree", "products"]).optional() }));

      assert.deepEqual(Query.read("view=tree"), { listing: { category: "all" }, view: "tree" });
      expectType<Equal<
        ReturnType<typeof Query.read>,
        { listing: { category: string; page?: number | undefined }; view?: "tree" | "products" | undefined }
      >>();
    });
  });

  it("nests a query's part in a bigger query", () => {
    const Query = urlQuery(param.object({ listing: ListingQuery.part, view: param.oneOf(["tree", "products"]) }));

    assert.equal(Query.write({ listing: { category: "brakes" }, view: "tree" }), "listing-category=brakes&view=tree");
  });
});

describe("urlQuery's guarantee", () => {
  const Query = urlQuery(param.object({
    text: param.text.optional(),
    int: param.int.optional(),
    number: param.number.optional(),
    flag: param.boolean.optional(),
    tags: param.list(param.text),
    nested: param.object({ kind: param.oneOf(["a", "b"]).default("a") }),
    vehicle: param.union("by", {
      model: param.object({ brand: param.int }),
      kba: param.object({ kba: param.text.default("") }),
    }),
  }));
  type Value = QueryOf<typeof Query>;

  it("reads back every value it writes", () => {
    const values: Value[] = [
      { tags: [], nested: { kind: "a" }, vehicle: { by: "kba", kba: "" } },
      { text: " a & b = c? ", int: -42, number: 19.99, flag: false, tags: ["x", " y", "ż"], nested: { kind: "b" }, vehicle: { by: "model", brand: 1 } },
      { text: "-", int: Number.MAX_SAFE_INTEGER, number: 1e-7, flag: true, tags: ["a-b", "a"], nested: { kind: "a" }, vehicle: { by: "kba", kba: "x" } },
    ];

    for (const value of values) {
      assert.deepEqual(Query.read(Query.write(value)), value);
    }
  });

  it("reads back an empty text, and one of spaces, apart from a missing one", () => {
    const base: Value = { tags: [], nested: { kind: "a" }, vehicle: { by: "kba", kba: "x" } };

    for (const value of [base, { ...base, text: "" }, { ...base, text: "  " }, { ...base, tags: ["", " "] }]) {
      assert.deepEqual(Query.read(Query.write(value)), value);
    }
  });

  it("reads a value it cannot write as its default, reporting each such value", () => {
    const { result, errors } = reported(() => Query.write({
      int: 1.5,
      number: Infinity,
      tags: ["a"],
      nested: { kind: "b" },
      vehicle: { by: "kba", kba: "" },
    }));

    assert.deepEqual(Query.read(result), { tags: ["a"], nested: { kind: "b" }, vehicle: { by: "kba", kba: "" } });
    assert.deepEqual(errors, [cannotHold("int", "a whole number between -(2^53 - 1) and 2^53 - 1", "1.5", "nothing is written, so it reads as undefined"), cannotHold("number", "a finite number", "Infinity", "nothing is written, so it reads as undefined")]);
  });

  it("reads no query when a required value cannot be written", () => {
    const PageQuery = urlQuery(param.object({ category: param.text, page: param.int }));
    const { result, errors } = reported(() => PageQuery.write({ category: "brakes", page: 1.5 }));

    assert.equal(PageQuery.read(result), null);
    assert.deepEqual(errors, [cannotHold("page", "a whole number between -(2^53 - 1) and 2^53 - 1", "1.5", "nothing is written, so the whole query reads as null")]);
  });
});

