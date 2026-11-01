import { pathTo, type NoHyphens } from "../key.ts";
import { INVALID, type InputOf, type Part, type Simplify, type ValueOf } from "../part.ts";

type Fields = Record<string, Part<unknown, boolean, unknown>>;

/** An object of parts, keeping its fields, so that a union can tell its tag is none of them. */
export type ObjectPart<T, Required extends boolean = boolean, Input = T> = Part<T, Required, Input> & { readonly fields: Fields };

/** An object of the given types, a key whose type can be `undefined` an optional one. */
type ObjectOf<V> = Simplify<
  & { [K in keyof V as undefined extends V[K] ? never : K]: V[K] }
  & { [K in keyof V as undefined extends V[K] ? K : never]?: V[K] }
>;

type RequiredOf<F extends Fields> = true extends { [K in keyof F]: F[K]["required"] }[keyof F] ? true : false;

/**
 * The parts as an object, a nested one written under hyphenated keys: `price-min=20`. It reads the fields' values,
 * and writes their inputs, so a field with a default can be left out.
 */
export function object<F extends Fields>(
  fields: F & NoHyphens<F>,
): ObjectPart<ObjectOf<{ [K in keyof F]: ValueOf<F[K]> }>, RequiredOf<F>, ObjectOf<{ [K in keyof F]: InputOf<F[K]> }>>;
// The signature above types the value by the fields, which TypeScript cannot follow through `Object.entries`.
export function object(fields: Fields): ObjectPart<Record<string, unknown>> {
  const entries = Object.entries(fields);

  return {
    fields,
    required: entries.some(([, part]) => part.required),
    read: (params, key) => {
      const values: [string, unknown][] = [];
      for (const [name, part] of entries) {
        const value = part.read(params, pathTo(key, name));
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
      for (const [name, part] of entries) {
        part.write(params, pathTo(key, name), value[name]);
      }
    },
  };
}
