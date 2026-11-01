/** An object's keys, a nested one's after its object's key: `price-min`. */
export const pathTo = (key: string, name: string): string => (key === "" ? name : `${key}-${name}`);

type HyphenError = "A hyphen in a key reads as a nested object's key";

/** A key holding a hyphen, as a type no part matches, naming the reason; nothing for any other key. */
export type NoHyphens<F> = { [K in keyof F & string as K extends `${string}-${string}` ? K : never]: HyphenError };

/** The same for a single key. */
export type NoHyphen<K extends string> = K extends `${string}-${string}` ? HyphenError : unknown;
