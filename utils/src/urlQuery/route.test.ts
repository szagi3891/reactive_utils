// deno-lint-ignore-file ban-types -- `{}` is meant here: a value that is not null, or an object type with no keys.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { param, route, urlQuery } from "./index.ts";
import { expectType, reported, type Equal } from "./testing.ts";

describe("route", () => {
  const filmsQuery = urlQuery(param.object({ rodzaj: param.oneOf(["fabularne", "dokumentalne"]).default("fabularne") }));
  const home = route("/");
  const films = route("/filmy", { query: filmsQuery });
  const film = route("/filmy/:id", { params: { id: param.text } });
  const page = route("/seria/:slug/:page", { params: { slug: param.text, page: param.int }, query: filmsQuery });

  it("writes the path, each param in its segment, and the query after it", () => {
    assert.equal(home.href(), "/");
    assert.equal(films.href(), "/filmy");
    assert.equal(films.href({ query: { rodzaj: "dokumentalne" } }), "/filmy?rodzaj=dokumentalne");
    assert.equal(film.href({ params: { id: "QmP01eTau6o" } }), "/filmy/QmP01eTau6o");
    assert.equal(page.href({ params: { slug: "nasz-dom", page: 2 }, query: { rodzaj: "dokumentalne" } }), "/seria/nasz-dom/2?rodzaj=dokumentalne");
  });

  it("reads the params the router matched, and the query", () => {
    assert.deepEqual(home.read(), {});
    assert.deepEqual(films.read({ query: "rodzaj=dokumentalne" }), { query: { rodzaj: "dokumentalne" } });
    assert.deepEqual(films.read(), { query: { rodzaj: "fabularne" } });
    assert.deepEqual(film.read({ params: { id: "QmP01eTau6o" } }), { params: { id: "QmP01eTau6o" } });
    assert.deepEqual(page.read({ params: { slug: "nasz-dom", page: "2" }, query: "" }), { params: { slug: "nasz-dom", page: 2 }, query: { rodzaj: "fabularne" } });
  });

  it("reads null for a param missing, wrong or wrongly encoded, or a query without a required value", () => {
    const search = route("/szukaj", { query: urlQuery(param.object({ q: param.text })) });

    assert.equal(film.read({ params: {} }), null);
    assert.equal(page.read({ params: { slug: "nasz-dom", page: "x" } }), null);
    assert.equal(film.read({ params: { id: "%E0%A4%A" } }), null);
    assert.equal(search.read({ query: "" }), null);
  });

  it("encodes a param, and reads it back decoded, as the router hands it still encoded", () => {
    for (const id of ["zażółć gęślą", "a/b", "?#&=%", " ", "\uD83D", "\\"]) {
      const path = film.href({ params: { id } });
      const [, , segment] = new URL(path, "https://site").pathname.split("/");

      assert.equal(path.split("/").length, 3, path);
      assert.deepEqual(film.read({ params: { id: segment } }), { params: { id } }, JSON.stringify(id));
    }
  });

  it("writes a value it cannot hold anyway, reporting it", () => {
    const { result, errors } = reported(() => [film.href({ params: { id: ".." } }), film.href({ params: { id: "" } }), page.href({ params: { slug: "a", page: 1.5 } })]);

    assert.deepEqual(result, ["/filmy/..", "/filmy/", "/seria/a/1.5"]);
    assert.deepEqual(errors, [
      ['urlQuery: path param "id" expects a segment other than "", "." and "..", got ".."; it is written anyway, so the address does not read back the same.'],
      ['urlQuery: path param "id" expects a segment other than "", "." and "..", got ""; it is written anyway, so the address does not read back the same.'],
      ['urlQuery: path param "page" expects a whole number between -(2^53 - 1) and 2^53 - 1, got 1.5; it is written anyway, so the address does not read back the same.'],
    ]);
  });

  it("types href and read by the pattern and the query, holding only what the route has", () => {
    expectType<Equal<Parameters<typeof film.href>, [to: { params: { id: string } }]>>();
    expectType<Equal<Parameters<typeof films.href>, [to?: { query?: { rodzaj?: "fabularne" | "dokumentalne" | undefined } | undefined } | undefined]>>();
    expectType<Equal<Parameters<typeof home.href>, [to?: {} | undefined]>>();
    expectType<Equal<ReturnType<typeof film.read>, { params: { id: string } } | null>>();
    expectType<Equal<ReturnType<typeof films.read>, { query: { rodzaj: "fabularne" | "dokumentalne" } }>>();
  });

  it("does not type-check a missing param, one the pattern lacks, or a part with nothing to read in place of a segment", () => {
    // @ts-expect-error The pattern has a param.
    assert.throws(() => route("/filmy/:id"));
    // @ts-expect-error The pattern has no param `kind`.
    assert.throws(() => route("/filmy/:id", { params: { id: param.text, kind: param.text } }));
    // @ts-expect-error A path cannot leave a segment out.
    route("/filmy/:id", { params: { id: param.text.optional() } });
    // @ts-expect-error The route has no query.
    film.href({ params: { id: "x" }, query: {} });
    // @ts-expect-error The route has no params.
    films.href({ params: {} });
  });
});
