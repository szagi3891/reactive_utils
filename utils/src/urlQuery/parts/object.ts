import { pathTo, type NoHyphens } from "../key.ts";
import { INVALID, optionalOf, type InputOf, type OptionalPart, type Part, type Simplify, type ValueOf } from "../part.ts";

type Fields = Record<string, Part<unknown, boolean, unknown>>;

/** An object of parts, keeping its fields, so that a union can tell its tag is none of them. */
export type ObjectPart<T, Required extends boolean = boolean, Input = T> = Part<T, Required, Input> & { readonly fields: Fields };

/** An object of the given types, a key whose type can be `undefined` an optional one. */
type ObjectOf<V> = Simplify<
  & { [K in keyof V as undefined extends V[K] ? never : K]: V[K] }
  & { [K in keyof V as undefined extends V[K] ? K : never]?: V[K] }
>;

type RequiredOf<F extends Fields> = true extends { [K in keyof F]: F[K]["required"] }[keyof F] ? true : false;

type ValuesOf<F extends Fields> = ObjectOf<{ [K in keyof F]: ValueOf<F[K]> }>;
type InputsOf<F extends Fields> = ObjectOf<{ [K in keyof F]: InputOf<F[K]> }>;

/** What an object writes: its fields' inputs, or `undefined`, writing nothing, for one that needs no value. */
type ObjectInput<F extends Fields> = RequiredOf<F> extends true ? InputsOf<F> : InputsOf<F> | undefined;

/**
 * The parts as an object, a nested one written under hyphenated keys: `price-min=20`. It reads the fields' values,
 * and writes their inputs, so a field with a default can be left out; an object that needs no value can be left out
 * as a whole, so it reads as its fields do without one. `.optional()` reads `undefined` in its place when the address
 * holds no value it needs, or holds one wrong.
 */
export function object<F extends Fields>(
  fields: F & NoHyphens<F>,
): ObjectPart<ValuesOf<F>, RequiredOf<F>, ObjectInput<F>> & {
  optional(): OptionalPart<ValuesOf<F>, InputsOf<F>>;
};
// The signature above types the value by the fields, which TypeScript cannot follow through `Object.entries`.
export function object(fields: Fields): ObjectPart<Record<string, unknown>, boolean, Record<string, unknown> | undefined> & {
  optional(): OptionalPart<Record<string, unknown>, Record<string, unknown>>;
} {
  const entries = Object.entries(fields);

  const part: ObjectPart<Record<string, unknown>, boolean, Record<string, unknown> | undefined> = {
    fields,
    required: entries.some(([, field]) => field.required),
    read: (params, key) => {
      const values: [string, unknown][] = [];
      for (const [name, field] of entries) {
        const value = field.read(params, pathTo(key, name));
        if (value === INVALID) {
          return INVALID;
        }
        if (value !== undefined) {
          values.push([name, value]);
        }
      }

      return Object.fromEntries(values);
    },
    write: (params, key, value) => {
      for (const [name, field] of entries) {
        field.write(params, pathTo(key, name), value?.[name]);
      }
    },
  };

  return { ...part, optional: () => optionalOf(part) };
}
