import { leaf, type Leaf } from "./leaf.ts";

/** A finite number, as `String()` writes it: `20`, `19.99`, `1e-7`. */
export const number: Leaf<number> = leaf({
  expected: "a finite number",
  parse: (written) => (/^-?\d+(\.\d+)?(e[+-]\d+)?$/.test(written) ? Number(written) : undefined),
  format: String,
});
