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

/** What `read` takes: the params the router matched, when the pattern has any, and the search params. */
type ReadFrom<F, Q> = Simplify<
  (HasParams<F> extends true ? { params: RouterParams } : {}) &
  (HasQuery<Q> extends true ? { query?: QuerySource } : {})
>;

/** What `read` gives: the params and the query, each when the route has them. */
type ReadOf<F, Q> = Simplify<
  (HasParams<F> extends true ? { params: { [K in keyof F]: SegmentValue<F[K]> } } : {}) &
  (HasQuery<Q> extends true ? { query: QueryValue<Q> } : {})
>;

/** `null` when `read` can read the route as none: a param it cannot parse, or a query without a required value. */
type NullOf<F, Q> = HasParams<F> extends true ? null : Q extends { read(source: QuerySource): infer R } ? (null extends R ? null : never) : never;

/** The params the router matched, as `useParams()` or a page's `props.params` hands them: each segment as written. */
export type RouterParams = Readonly<Record<string, string | undefined>>;

/** A segment for each of the pattern's params, and none the pattern lacks. */
type ParamsCheck<P extends string, F> = { [K in ParamNames<P>]: Segment } & {
  [K in Exclude<keyof F, ParamNames<P>>]: "Not a param of the pattern";
};

/** A pattern without params, as a type no pattern with any matches, naming the reason. */
type NoParams<P extends string> = [ParamNames<P>] extends [never] ? unknown : "A pattern with params takes their segments";

/**
 * A page's address: its path, a param in a segment of its own, and the query after it. `href` and `read` take and give
 * one object of `params` and `query`, holding each only when the route has it, so every route is called the same way.
 */
export type Route<To, From, Read> = {
  readonly pattern: string;
  href(...to: {} extends To ? [to?: To] : [to: To]): string;
  read(...from: {} extends From ? [from?: From] : [from: From]): Read;
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
): Route<HrefTo<{}, Q>, ReadFrom<{}, Q>, ReadOf<{}, Q> | NullOf<{}, Q>>;
export function route<const P extends string, F extends Segments, Q extends AnyQuery | undefined = undefined>(
  pattern: P,
  parts: { params: F & ParamsCheck<P, F>; query?: Q },
): Route<HrefTo<F, Q>, ReadFrom<F, Q>, ReadOf<F, Q> | NullOf<F, Q>>;
// The signatures above type `href` and `read` by the pattern and the parts, which TypeScript cannot follow through
// a loop over the segments.
export function route(
  pattern: string,
  { params = {}, query }: { params?: Segments; query?: AnyQuery } = {},
): Route<never, never, unknown> {
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

  return {
    pattern,
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
    read: ({ params: matched = {}, query: source = "" }: { params?: RouterParams; query?: QuerySource } = {}) => {
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
    },
  };
}

/** The value of a segment as the router matched it, still encoded; `undefined` for none, or one wrongly encoded. */
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
