import { pathTo, type NoHyphen } from "../key.ts";
import { INVALID, optionalOf, type InputOf, type OptionalPart, type Part, type Simplify, type ValueOf } from "../part.ts";
import type { ObjectPart } from "./object.ts";

type Variants = Record<string, ObjectPart<object, boolean, object | undefined>>;

/** Each variant's value, with the tag naming it. */
type UnionValue<Tag extends string, V extends Variants> = { [N in keyof V & string]: Simplify<{ [K in Tag]: N } & ValueOf<V[N]>> }[keyof V & string];

/** Each variant's input, with the tag naming it. */
type UnionInput<Tag extends string, V extends Variants> = { [N in keyof V & string]: Simplify<{ [K in Tag]: N } & NonNullable<InputOf<V[N]>>> }[keyof V & string];

/**
 * One of the objects, its name written under the tag: `by=model&brand=184`. Its value and its input are one object of
 * each variant with the tag naming it. It needs a value, as a tag and a variant's values; `.optional()` reads
 * `undefined` in its place when the address holds none, an unknown tag, or a variant without a value it needs.
 */
export function union<Tag extends string, V extends Variants>(
  tag: Tag & NoHyphen<Tag>,
  variants: V,
): Part<UnionValue<Tag, V>, true, UnionInput<Tag, V>> & {
  optional(): OptionalPart<UnionValue<Tag, V>, UnionInput<Tag, V>>;
};
// The signature above types the value by the variants, which TypeScript cannot follow through an index.
export function union(tag: string, variants: Record<string, ObjectPart<object, boolean, object | undefined>>): Part<Record<string, unknown>, true> & {
  optional(): OptionalPart<Record<string, unknown>, Record<string, unknown>>;
} {
  for (const [name, variant] of Object.entries(variants)) {
    if (Object.hasOwn(variant.fields, tag)) {
      throw new Error(`The variant "${name}" has a key "${tag}", the union's tag`);
    }
  }

  const part: Part<Record<string, unknown>, true> = {
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

  return { ...part, optional: () => optionalOf(part) };
}
