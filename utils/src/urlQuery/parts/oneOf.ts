import { leaf, type Leaf } from "./leaf.ts";

/** One of the given words. */
export const oneOf = <const T extends readonly [string, ...string[]]>(values: T): Leaf<T[number]> =>
  leaf({
    expected: `one of ${values.map((value) => JSON.stringify(value)).join(", ")}`,
    parse: (written) => values.find((value) => value === written),
    format: (value) => value,
  });
