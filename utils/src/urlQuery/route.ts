// deno-lint-ignore-file ban-types -- `{}` is meant here: a value that is not null, or an object type with no keys.
import type { Simplify } from "./part.ts";
import { shown, type Primitive } from "./parts/leaf.ts";
import type { QuerySource } from "./source.ts";

/**
 * A param of the path, one segment: a leaf with nothing to read in its place, so neither `.optional()` nor
 * `.default()`, as an address without the segment is another page.
 */
type Segment = {
  readonly expected: string;
  parse(written: string): Primitive | undefined;
  format(value: Primitive): string;
};

type Segments = Record<string, Segment>;

/** What a query of a route is to it: the search params after the path, read and written. */
type AnyQuery = {
  read(source: QuerySource): unknown;
  href(path: string, query: unknown): string;
};

/** The names of the pattern's params, each a segment starting with a colon: `id` of `/filmy/:id`. */
type ParamNames<P extends string> = P extends `${infer Head}/${infer Rest}` ? NameOf<Head> | ParamNames<Rest> : NameOf<P>;
type NameOf<S extends string> = S extends `:${infer Name}` ? Name : never;

type SegmentValue<S> = S extends { parse(written: string): infer T } ? Exclude<T, undefined> : never;
type QueryValue<Q> = Q extends { read(source: QuerySource): infer R } ? NonNullable<R> : never;
type QueryInput<Q> = Q extends { href(path: string, query: infer I): string } ? I : never;
type HasParams<F> = [keyof F] extends [never] ? false : true;
type HasQuery<Q> = [Q] extends [undefined] ? false : true;

/** What `href` takes: the params, when the pattern has any, and the query, when the route has one and needs a value. */
type HrefTo<F, Q> = Simplify<
  (HasParams<F> extends true ? { params: { [K in keyof F]: SegmentValue<F[K]> } } : {}) &
  (HasQuery<Q> extends false ? {} : {} extends QueryInput<Q> ? { query?: QueryInput<Q> } : { query: QueryInput<Q> })
>;

/** What `fromQuery` gives: the query as it reads, `null` only for one without a required value; `{}` for a route without a query. */
type FromQueryOf<Q> = Q extends { read(source: QuerySource): infer R } ? R : {};

/** What `match` gives: the params and the query, each when the route has them. */
type MatchOf<F, Q> = Simplify<
  (HasParams<F> extends true ? { params: { [K in keyof F]: SegmentValue<F[K]> } } : {}) &
  (HasQuery<Q> extends true ? { query: QueryValue<Q> } : {})
>;

/** A segment for each of the pattern's params, and none the pattern lacks. */
type ParamsCheck<P extends string, F> = { [K in ParamNames<P>]: Segment } & {
  [K in Exclude<keyof F, ParamNames<P>>]: "Not a param of the pattern";
};

/** A pattern without params, as a type no pattern with any matches, naming the reason. */
type NoParams<P extends string> = [ParamNames<P>] extends [never] ? unknown : "A pattern with params takes their segments";

/**
 * A page's address: its path, a param in a segment of its own, and the query after it. `href` and `match` take and give
 * one object of `params` and `query`, holding each only when the route has it, so every route is called the same way.
 * `match` reads them from the address alone, without the router, so a page can tell its params, or whether an address
 * is its own; `fromQuery` reads the query alone, for a page the router hands its search params but not its path.
 */
export type Route<To, FromQuery, Match> = {
  href(...to: {} extends To ? [to?: To] : [to: To]): string;
  /** The query of the search params, as the route's query reads it; `{}` for a route without one, read from nothing. */
  fromQuery(source: QuerySource): FromQuery;
  /**
   * The params and the query of the address: the path as it holds it, still encoded, a slash at its end left out, as
   * the router opens the page with one too, and the search params, taken even by a route without a query, so every
   * route is called the same way. `null` for a path of another pattern, a param it cannot read, or a query without a
   * required value.
   */
  match(from: { path: string; query: QuerySource }): Match | null;
};

/** A segment a path cannot hold as written: the browser drops an empty one, and reads `.` and `..` as a move. */
const unwritable = (written: string): boolean => written === "" || written === "." || written === "..";

/** What a path param expects besides its leaf's values. */
const SEGMENT = 'a segment other than "", "." and ".."';

/**
 * A page's address of the pattern, its params read and written through the given segments, and the search params
 * through the given query. A param is written as its leaf formats it, then encoded, and read back decoded, so it
 * reads back the same. A value that would not, the leaf's check, or one a segment cannot hold, it reports with
 * `console.error`, as a leaf does; as a path cannot leave the segment out, it is written anyway.
 */
export function route<const P extends string, Q extends AnyQuery | undefined = undefined>(
  pattern: P & NoParams<P>,
  parts?: { query?: Q },
): Route<HrefTo<{}, Q>, FromQueryOf<Q>, MatchOf<{}, Q>>;
export function route<const P extends string, F extends Segments, Q extends AnyQuery | undefined = undefined>(
  pattern: P,
  parts: { params: F & ParamsCheck<P, F>; query?: Q },
): Route<HrefTo<F, Q>, FromQueryOf<Q>, MatchOf<F, Q>>;
// The signatures above type `href`, `fromQuery` and `match` by the pattern and the parts, which TypeScript cannot follow through
// a loop over the segments.
export function route(
  pattern: string,
  { params = {}, query }: { params?: Segments; query?: AnyQuery } = {},
): Route<never, unknown, unknown> {
  const pieces = pattern.split("/").map((piece) => {
    if (!piece.startsWith(":")) {
      return piece;
    }
    const name = piece.slice(1);
    const segment = Object.hasOwn(params, name) ? params[name] : undefined;
    if (segment === undefined) {
      throw new Error(`The pattern "${pattern}" has a param "${name}" without a segment`);
    }
    return { name, segment };
  });
  for (const name of Object.keys(params)) {
    if (!pieces.some((piece) => typeof piece !== "string" && piece.name === name)) {
      throw new Error(`The pattern "${pattern}" has no param "${name}"`);
    }
  }

  /** The params and the query from the segments the path matched, still encoded, and the search params. */
  const read = (matched: Record<string, string>, source: QuerySource): {} | null => {
    const values: Record<string, Primitive> = {};
    for (const piece of pieces) {
      if (typeof piece !== "string") {
        const value = parseSegment(piece.segment, matched[piece.name]);
        if (value === undefined) {
          return null;
        }
        values[piece.name] = value;
      }
    }
    if (query === undefined) {
      return Object.keys(params).length === 0 ? {} : { params: values };
    }

    const value = query.read(source);
    if (value === null) {
      return null;
    }
    return Object.keys(params).length === 0 ? { query: value } : { params: values, query: value };
  };

  return {
    // The query is left out only when it can be empty, so it is written as one.
    href: ({ params: values = {}, query: queryValue = {} }: { params?: Record<string, Primitive>; query?: unknown } = {}) => {
      const path = pieces.map((piece) => {
        if (typeof piece === "string") {
          return piece;
        }
        const { name, segment } = piece;
        const value = values[name];
        if (value === undefined) {
          throw new Error(`The path param "${name}" has no value`);
        }
        const written = segment.format(value);
        const expected = segment.parse(written) !== value ? segment.expected : unwritable(written) ? SEGMENT : undefined;
        if (expected !== undefined) {
          console.error(`urlQuery: path param "${name}" expects ${expected}, got ${shown(value)}; it is written anyway, so the address does not read back the same.`);
        }
        return encodeURIComponent(written);
      }).join("/");
      return query === undefined ? path : query.href(path, queryValue);
    },
    fromQuery: (source: QuerySource) => (query === undefined ? {} : query.read(source)),
    // The type takes the search params; without them, as from untyped code, it reads none.
    match: ({ path, query: source = "" }: { path: string; query?: QuerySource }) => {
      // The router opens `/filmy/x/` as `/filmy/x`; `/` itself is the home page's path, not a slash at the end of one.
      const segments = (path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path).split("/");
      if (segments.length !== pieces.length) {
        return null;
      }
      const matched: Record<string, string> = {};
      for (const [index, piece] of pieces.entries()) {
        const segment = segments[index] ?? "";
        if (typeof piece === "string") {
          if (segment !== piece) {
            return null;
          }
        } else {
          // A router matches no param of an empty segment.
          if (segment === "") {
            return null;
          }
          matched[piece.name] = segment;
        }
      }

      return read(matched, source);
    },
  };
}

/** The value of a segment as the path holds it, still encoded; `undefined` for none, or one wrongly encoded. */
const parseSegment = (segment: Segment, matched: string | undefined): Primitive | undefined => {
  if (matched === undefined) {
    return undefined;
  }
  try {
    return segment.parse(decodeURIComponent(matched));
  } catch {
    return undefined;
  }
};
