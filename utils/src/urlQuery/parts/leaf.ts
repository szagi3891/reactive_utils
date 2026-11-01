import { INVALID, type Params, type Part } from "../part.ts";

export type Primitive = string | number | boolean;

/** One value written as one string, the part every other is built of. */
export type Leaf<T extends Primitive> = Part<T, true> & LeafCodec<T> & {
  /** Writes the value, or, when it would not read back the same, reports it with what is done instead, the outcome. */
  writeOr(params: URLSearchParams, key: string, value: T, outcome: string): void;
  /** The value, or `undefined` when the address holds none. */
  optional(): Part<T | undefined, false>;
  /**
   * The value, or the fallback when the address holds none. The fallback is not written, so it reads back as well, nor
   * is `undefined`, so a value can be left out to read as the fallback.
   */
  default(fallback: T): Part<T, false, T | undefined>;
};

/** How a leaf turns its string into a value, and the value back into a string. */
export type LeafCodec<T extends Primitive> = {
  /** The values it holds, for the message about one it cannot write: `a whole number`. */
  expected: string;
  /** The value the string holds, or `undefined` when it holds none. */
  parse: (written: string) => T | undefined;
  format: (value: T) => string;
};

/** A value as a message shows it: a text in quotes, so an empty one or spaces show. */
export const shown = (value: Primitive): string => (typeof value === "string" ? JSON.stringify(value) : String(value));

/**
 * A leaf of the given pair of functions. The one place the guarantee is kept: a value is written only when its string
 * reads back as the same value. Any other is reported with `console.error`, saying what it reads as instead, and left
 * out, so it reads as a missing one: the fallback of `.default()`, `undefined` of `.optional()`, gone from a list, or
 * no query when required.
 */
export const leaf = <T extends Primitive>({ expected, parse, format }: LeafCodec<T>): Leaf<T> => {
  const readFirst = (params: Params, key: string): T | undefined => {
    const [written] = params.get(key) ?? [];
    return written === undefined ? undefined : parse(written);
  };
  const writeOr = (params: URLSearchParams, key: string, value: T, outcome: string): void => {
    const written = format(value);
    if (parse(written) !== value) {
      console.error(`urlQuery: key "${key}" expects ${expected}, got ${shown(value)}; ${outcome}.`);
      return;
    }
    params.append(key, written);
  };

  return {
    required: true,
    expected,
    parse,
    format,
    writeOr,
    read: (params, key) => readFirst(params, key) ?? INVALID,
    write: (params, key, value) => {
      writeOr(params, key, value, "nothing is written, so the whole query reads as null");
    },
    optional: () => ({
      required: false,
      read: readFirst,
      write: (params, key, value) => {
        if (value !== undefined) {
          writeOr(params, key, value, "nothing is written, so it reads as undefined");
        }
      },
    }),
    default: (fallback) => ({
      required: false,
      read: (params, key) => readFirst(params, key) ?? fallback,
      write: (params, key, value) => {
        if (value !== undefined && value !== fallback) {
          writeOr(params, key, value, `nothing is written, so it reads as its default ${shown(fallback)}`);
        }
      },
    }),
  };
};
