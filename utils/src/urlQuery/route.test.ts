// deno-lint-ignore-file ban-types -- `{}` is meant here: a value that is not null, or an object type with no keys.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { param, route, urlQuery } from "./index.ts";
import type { QuerySource } from "./source.ts";
import { expectType, reported, type Equal } from "./testing.ts";

describe("route", () => {
  const filmsQuery = urlQuery(param.object({ rodzaj: param.oneOf(["fabularne", "dokumentalne"]).default("fabularne") }));
  const home = route("/");
  const films = route("/filmy", { query: filmsQuery });
  const film = route("/filmy/:id", { params: { id: param.text } });
  const page = route("/seria/:slug/:page", { params: { slug: param.text, page: param.int }, query: filmsQuery });
  const search = route("/szukaj", { query: urlQuery(param.object({ q: param.text })) });

  it("writes the path, each param in its segment, and the query after it", () => {
    assert.equal(home.href(), "/");
    assert.equal(films.href(), "/filmy");
    assert.equal(films.href({ query: { rodzaj: "dokumentalne" } }), "/filmy?rodzaj=dokumentalne");
    assert.equal(film.href({ params: { id: "QmP01eTau6o" } }), "/filmy/QmP01eTau6o");
    assert.equal(page.href({ params: { slug: "nasz-dom", page: 2 }, query: { rodzaj: "dokumentalne" } }), "/seria/nasz-dom/2?rodzaj=dokumentalne");
  });

  it("reads the query of the search params, from any source, and {} for a route without a query", () => {
    assert.deepEqual(films.fromQuery("rodzaj=dokumentalne"), { rodzaj: "dokumentalne" });
    assert.deepEqual(films.fromQuery(new URLSearchParams({ rodzaj: "dokumentalne" })), { rodzaj: "dokumentalne" });
    assert.deepEqual(films.fromQuery({ rodzaj: "dokumentalne" }), { rodzaj: "dokumentalne" });
    assert.deepEqual(films.fromQuery(""), { rodzaj: "fabularne" });
    assert.deepEqual(page.fromQuery("rodzaj=dokumentalne"), { rodzaj: "dokumentalne" });
    assert.deepEqual(home.fromQuery("rodzaj=dokumentalne"), {});
    assert.deepEqual(film.fromQuery(""), {});
  });

  it("reads null from the query without a required value", () => {
    assert.equal(search.fromQuery(""), null);
    assert.deepEqual(search.fromQuery("q=modlitwa"), { q: "modlitwa" });
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

  it("matches a path as the router would, reading what read reads from the params it would match", () => {
    assert.deepEqual(home.match({ path: "/", query: "" }), {});
    assert.deepEqual(films.match({ path: "/filmy", query: "rodzaj=dokumentalne" }), { query: { rodzaj: "dokumentalne" } });
    assert.deepEqual(film.match({ path: "/filmy/QmP01eTau6o", query: "" }), { params: { id: "QmP01eTau6o" } });
    assert.deepEqual(page.match({ path: "/seria/nasz-dom/2", query: "" }), { params: { slug: "nasz-dom", page: 2 }, query: { rodzaj: "fabularne" } });
  });

  it("matches a path with a slash at its end as the one without, as the router does", () => {
    assert.deepEqual(films.match({ path: "/filmy/", query: "rodzaj=dokumentalne" }), { query: { rodzaj: "dokumentalne" } });
    assert.deepEqual(film.match({ path: "/filmy/QmP01eTau6o/", query: "" }), { params: { id: "QmP01eTau6o" } });
    assert.deepEqual(page.match({ path: "/seria/nasz-dom/2/", query: "" }), { params: { slug: "nasz-dom", page: 2 }, query: { rodzaj: "fabularne" } });
    assert.equal(film.match({ path: "/filmy/QmP01eTau6o//", query: "" }), null);
  });

  it("matches no path of another pattern, an empty segment, a param it cannot read, nor a query without a required value", () => {
    assert.equal(search.match({ path: "/szukaj", query: "" }), null);
    assert.equal(home.match({ path: "/filmy", query: "" }), null);
    assert.equal(film.match({ path: "/filmy", query: "" }), null);
    assert.equal(film.match({ path: "/filmy/", query: "" }), null);
    assert.equal(film.match({ path: "/filmy/a/b", query: "" }), null);
    assert.equal(film.match({ path: "/seriale/a", query: "" }), null);
    assert.equal(film.match({ path: "/filmy/%E0%A4%A", query: "" }), null);
    assert.equal(page.match({ path: "/seria/nasz-dom/x", query: "" }), null);
  });

  it("matches the path href writes, each param encoded in its segment, reading back the same params", () => {
    for (const id of ["zażółć gęślą", "a/b", "?#&=%", " ", "\uD83D", "\\"]) {
      assert.equal(film.href({ params: { id } }).split("/").length, 3, id);
      assert.deepEqual(film.match({ path: film.href({ params: { id } }), query: "" }), { params: { id } }, JSON.stringify(id));
    }
    const to = { params: { slug: "nasz-dom", page: 2 }, query: { rodzaj: "dokumentalne" as const } };
    const [path, search] = page.href(to).split("?");
    assert.deepEqual(page.match({ path: path ?? "", query: search ?? "" }), to);
  });

  it("types href, fromQuery and match by the pattern and the query, holding only what the route has", () => {
    expectType<Equal<Parameters<typeof film.href>, [to: { params: { id: string } }]>>();
    expectType<Equal<Parameters<typeof films.href>, [to?: { query?: { rodzaj?: "fabularne" | "dokumentalne" | undefined } | undefined } | undefined]>>();
    expectType<Equal<Parameters<typeof home.href>, [to?: {} | undefined]>>();
    expectType<Equal<ReturnType<typeof films.fromQuery>, { rodzaj: "fabularne" | "dokumentalne" }>>();
    expectType<Equal<ReturnType<typeof film.fromQuery>, {}>>();
    expectType<Equal<ReturnType<typeof search.fromQuery>, { q: string } | null>>();
    expectType<Equal<Parameters<typeof film.match>, [from: { path: string; query: QuerySource }]>>();
    expectType<Equal<Parameters<typeof films.match>, [from: { path: string; query: QuerySource }]>>();
    expectType<Equal<ReturnType<typeof film.match>, { params: { id: string } } | null>>();
    expectType<Equal<ReturnType<typeof films.match>, { query: { rodzaj: "fabularne" | "dokumentalne" } } | null>>();
    expectType<Equal<ReturnType<typeof home.match>, {} | null>>();
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
    // @ts-expect-error The search params are taken even by a route without a query.
    film.match({ path: "/filmy/x" });
    // @ts-expect-error The search params are taken by a route with a query.
    films.match({ path: "/filmy" });
  });
});
