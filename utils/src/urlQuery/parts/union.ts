import { pathTo, type NoHyphen } from "../key.ts";
import { INVALID, type InputOf, type Part, type Simplify, type ValueOf } from "../part.ts";
import type { ObjectPart } from "./object.ts";

type Variants = Record<string, ObjectPart<object, boolean, object>>;

/**
 * One of the objects, its name written under the tag: `by=model&brand=184`. Its value and its input, one object of each
 * variant with the tag naming it, are spelled out here rather than named, so that an editor shows them as plain object
 * types.
 */
export function union<Tag extends string, V extends Variants>(
  tag: Tag & NoHyphen<Tag>,
  variants: V,
): Part<
  { [N in keyof V & string]: Simplify<{ [K in Tag]: N } & ValueOf<V[N]>> }[keyof V & string],
  true,
  { [N in keyof V & string]: Simplify<{ [K in Tag]: N } & InputOf<V[N]>> }[keyof V & string]
>;
// The signature above types the value by the variants, which TypeScript cannot follow through an index.
export function union(tag: string, variants: Record<string, ObjectPart<object>>): Part<Record<string, unknown>, true> {
  for (const [name, variant] of Object.entries(variants)) {
    if (Object.hasOwn(variant.fields, tag)) {
      throw new Error(`The variant "${name}" has a key "${tag}", the union's tag`);
    }
  }

  return {
    required: true,
    read: (params, key) => {
      const [name] = params.get(pathTo(key, tag)) ?? [];
      const variant = name !== undefined && Object.hasOwn(variants, name) ? variants[name] : undefined;
      if (name === undefined || variant === undefined) {
        return INVALID;
      }

      const value = variant.read(params, key);
      return value === INVALID ? INVALID : { [tag]: name, ...value };
    },
    write: (params, key, value) => {
      const name = String(value[tag]);
      const variant = Object.hasOwn(variants, name) ? variants[name] : undefined;
      if (variant === undefined) {
        throw new Error(`The union has no variant "${name}"`);
      }
      params.append(pathTo(key, tag), name);
      variant.write(params, key, value);
    },
  };
}
