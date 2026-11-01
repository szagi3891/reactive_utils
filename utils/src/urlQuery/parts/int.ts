import { leaf, type Leaf } from "./leaf.ts";

/** A whole number, a safe integer written in decimal. */
export const int: Leaf<number> = leaf({
  expected: "a whole number between -(2^53 - 1) and 2^53 - 1",
  parse: (written) => {
    const value = Number(written);
    return /^-?\d+$/.test(written) && Number.isSafeInteger(value) ? value : undefined;
  },
  format: String,
});
