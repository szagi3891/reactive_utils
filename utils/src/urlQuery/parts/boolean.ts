import { leaf, type Leaf } from "./leaf.ts";

/** `true` or `false`, read in any case, so `TRUE` too; written in lowercase. */
export const boolean: Leaf<boolean> = leaf({
  expected: "true or false",
  parse: (written) => {
    const word = written.toLowerCase();
    return word === "true" ? true : word === "false" ? false : undefined;
  },
  format: String,
});
