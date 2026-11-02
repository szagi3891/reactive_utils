// deno-lint-ignore-file ban-types -- `{}` is meant here: a value that is not null, or an object type with no keys.
/**
 * The values in the address by key, a repeated key's in order. A blank one is kept, as for a text it is a value of its
 * own, unlike a missing one; a part that cannot parse it reads it as a wrong one.
 */
export type Params = ReadonlyMap<string, readonly string[]>;

/** What a part reads when the address does not hold a value it needs, so the whole query reads as none. */
export const INVALID = Symbol("invalid");

/**
 * A part of a query, reading its value `T` from the params under its key and writing it back there. `Required` is
 * whether it needs a value from the address, so that an address without one reads as no query. `Input` is what it
 * writes, `T` but for a value that reads as a default, which can be left out: `undefined` writes nothing, so it reads
 * as the default.
 */
export type Part<T, Required extends boolean = boolean, Input = T> = {
  readonly required: Required;
  read(params: Params, key: string): T | typeof INVALID;
  write(params: URLSearchParams, key: string, value: Input): void;
};

/** A part that can be left out, as `.optional()` gives it. */
export type OptionalPart<T, Input> = Part<T | undefined, false, Input | undefined>;

/**
 * The part, or `undefined` when the address holds none of it, or holds it wrong; `undefined` writes nothing, so it reads
 * back the same. What `.optional()` of an object or a union gives; a leaf's checks its own string instead.
 */
export const optionalOf = <T, Input>(part: Part<T, boolean, Input>): OptionalPart<T, Input> => ({
  required: false,
  read: (params, key) => {
    const value = part.read(params, key);
    return value === INVALID ? undefined : value;
  },
  write: (params, key, value) => {
    if (value !== undefined) {
      part.write(params, key, value);
    }
  },
});

/** What a part reads, defaults filled in. */
export type ValueOf<P> = P extends { read(params: Params, key: string): infer T } ? Exclude<T, typeof INVALID> : never;

/** What a part writes, defaults left out if need be. */
export type InputOf<P> = P extends { write(params: URLSearchParams, key: string, value: infer I): void } ? I : never;

export type Simplify<T> = { [K in keyof T]: T[K] } & {};
