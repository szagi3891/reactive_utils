import { mock } from "node:test";
import type { INVALID, Part } from "./part.ts";
import { paramsOf } from "./source.ts";

/** What the part reads from the search string under the key `k`. */
export const readK = <T>(part: Part<T>, search: string): T | typeof INVALID => part.read(paramsOf(search), "k");

/** The search string the part writes for the value under the key `k`. */
export const writeK = <T>(part: Part<T>, value: T): string => {
  const params = new URLSearchParams();
  part.write(params, "k", value);
  return params.toString();
};

/** What `run` gives, and the arguments of each `console.error` it made, kept out of the test output. */
export const reported = <T>(run: () => T): { result: T; errors: unknown[][] } => {
  const errors: unknown[][] = [];
  const error = mock.method(console, "error", (...args: unknown[]) => {
    errors.push(args);
  });
  try {
    return { result: run(), errors };
  } finally {
    error.mock.restore();
  }
};

/**
 * The `console.error` a leaf makes for a value it cannot write under the key: the value as the message shows it, and
 * what is done instead.
 */
export const cannotHold = (key: string, expected: string, got: string, outcome: string): unknown[] => [
  `urlQuery: key "${key}" expects ${expected}, got ${got}; ${outcome}.`,
];

/** Checked by `tsc`: `true` only when the two types are the same. */
export type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

export const expectType = <T extends true>(): T | void => undefined;
