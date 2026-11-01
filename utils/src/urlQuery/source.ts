import type { Params } from "./part.ts";

/** The search params `useSearchParams()` hands a page; a key repeated in the address comes as an array. */
export type PageSearchParams = Record<string, string | string[] | undefined>;

/** Where a query can be read from: a page's search params, a `URLSearchParams`, or a search string. */
export type QuerySource = PageSearchParams | URLSearchParams | string;

/** Every value in the source, a repeated key once per value. */
const entriesOf = (source: QuerySource): (readonly [string, string])[] =>
  typeof source === "string" || source instanceof URLSearchParams
    ? [...new URLSearchParams(source).entries()]
    : Object.entries(source).flatMap(([key, value]) =>
      (Array.isArray(value) ? value : [value]).flatMap((item): (readonly [string, string])[] => (item === undefined ? [] : [[key, item]])));

export const paramsOf = (source: QuerySource): Params => {
  const params = new Map<string, string[]>();
  for (const [key, value] of entriesOf(source)) {
    params.set(key, [...(params.get(key) ?? []), value]);
  }

  return params;
};
