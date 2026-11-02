// deno-lint-ignore-file ban-types -- `{}` is meant here: a value that is not null, or an object type with no keys.
/**
 * A query kept in the address bar, built of a closed set of parts, so that whatever a query writes it reads back the
 * same. The guarantee rests on two rules:
 *
 * - A leaf, one value written as one string, writes a value only when that string reads back as the same value. Any
 *   other it reports with `console.error` and leaves out, so it reads as its default. It is the one place that checks
 *   a value; every other part only puts leaves together.
 * - Each part writes under its own key and reads only from there, so parts cannot read each other's values: the keys
 *   of an object hold no hyphen, which joins a nested object's keys, and a union's tag is none of its variants' keys.
 */
import { INVALID, type Part } from "./part.ts";
import { boolean } from "./parts/boolean.ts";
import { int } from "./parts/int.ts";
import { list } from "./parts/list.ts";
import { number } from "./parts/number.ts";
import { object } from "./parts/object.ts";
import { oneOf } from "./parts/oneOf.ts";
import { text } from "./parts/text.ts";
import { union } from "./parts/union.ts";
import { paramsOf, type QuerySource } from "./source.ts";

export type { Part } from "./part.ts";
export { route, type Route } from "./route.ts";
export type { PageSearchParams, QuerySource } from "./source.ts";

/**
 * The parts a query is built of. Typed explicitly, as JSR, writing the types of the npm package, drops the members
 * of an object written in shorthand, so `param` would be `{}` there.
 */
export const param: {
  text: typeof text;
  int: typeof int;
  number: typeof number;
  boolean: typeof boolean;
  oneOf: typeof oneOf;
  list: typeof list;
  object: typeof object;
  union: typeof union;
} = { text, int, number, boolean, oneOf, list, object, union };

/**
 * A query, typed as zod types a schema, by its output and its input. `Read` is what `read` gives: the values, defaults
 * filled in, or `null` for a query with a required value, as an address can be without it; the values alone for a
 * query of nothing required, or one given a `.default()`. `Input` is what `write` takes: the values, those with a
 * default left out if need be; the same as the values when nothing has a default.
 */
export type UrlQuery<Read, Input = NonNullable<Read>> = {
  /** The part the query is read and written through, to nest in a bigger query; required when `read` can give null. */
  part: Part<NonNullable<Read>, null extends Read ? true : false, Input>;
  /**
   * The query in the given search params, a missing or wrong value as its default or none; `null` only when a required
   * value is missing or wrong, so never for a query of nothing required.
   */
  read: (source: QuerySource) => Read;
  /** The search string for the query, without the leading `?`; `""` for a query with nothing to write. */
  write: (query: Input) => string;
  /** The path with the query's search string. */
  href: (path: string, query: Input) => string;
  /** The same query, reading the fallback in place of `null`, so for an address without a required value. */
  default: (fallback: NonNullable<Read>) => UrlQuery<NonNullable<Read>, Input>;
};

/** The values a query reads, defaults filled in, as `z.output` gives them for a schema. */
export type QueryOf<Q> = Q extends { read: (source: QuerySource) => infer Read } ? NonNullable<Read> : never;

/** The values a query writes, those with a default left out if need be, as `z.input` gives them for a schema. */
export type QueryInputOf<Q> = Q extends { write: (query: infer Input) => string } ? Input : never;

/** The members of a query, whatever its values, as the implementation of `urlQuery` builds them. */
type AnyUrlQuery = Omit<UrlQuery<{} | null, unknown>, "part"> & { part: Part<{}, boolean, unknown> };

/** A query kept in the address bar, read and written through one part, mostly a `param.object` or a `param.union`. */
export function urlQuery<T extends {}, Required extends boolean, Input>(
  part: Part<T, Required, Input>,
): UrlQuery<Required extends true ? T | null : T, Input>;
// The signature above drops `null` from `read` for a query of nothing required, which TypeScript cannot follow from a
// type parameter. It holds, as only a required part reads as `INVALID`. The implementation takes no type parameters,
// as JSR checks the published types with the implementation's body left out, so they would be unused.
export function urlQuery(part: Part<{}, boolean, unknown>): AnyUrlQuery {
  const write = (query: unknown): string => {
    const params = new URLSearchParams();
    part.write(params, "", query);
    return params.toString();
  };

  return {
    part,
    read: (source) => {
      const value = part.read(paramsOf(source), "");
      return value === INVALID ? null : value;
    },
    write,
    href: (path, query) => {
      const search = write(query);
      return search === "" ? path : `${path}?${search}`;
    },
    default: (fallback) => urlQuery({
      required: false,
      read: (params, key) => {
        const value = part.read(params, key);
        return value === INVALID ? fallback : value;
      },
      write: part.write,
    }),
  };
}
