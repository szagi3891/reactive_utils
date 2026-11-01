import type { Part } from "../part.ts";
import type { Leaf, Primitive } from "./leaf.ts";

/**
 * The values of a key repeated in the address, `brand=a&brand=b`, leaving out the ones the item cannot read; none
 * when the key is missing, so no values can be left out, to write none.
 */
export const list = <T extends Primitive>(item: Leaf<T>): Part<T[], false, readonly T[] | undefined> => ({
  required: false,
  read: (params, key) => (params.get(key) ?? []).flatMap((written) => {
    const value = item.parse(written);
    return value === undefined ? [] : [value];
  }),
  write: (params, key, values) => {
    for (const value of values ?? []) {
      item.writeOr(params, key, value, "it is left out of the list");
    }
  },
});
