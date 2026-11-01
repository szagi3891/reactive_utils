import { leaf, type Leaf } from "./leaf.ts";

// A half of a character outside the basic plane, such as an emoji cut in two, which UTF-8, so the address, cannot hold;
// and a backslash, which starts the escape that holds the half instead.
const UNWRITABLE = /\\|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

// The escapes `format` writes: a backslash, and a half written as `\uD83D`.
const ESCAPE = /\\(\\|u[dD][89a-fA-F][0-9a-fA-F]{2})/g;

/**
 * Any text, as it is written: an empty one, one of spaces, and spaces at its ends included. A half of a character
 * is written as `\uD83D`, so a backslash as `\\`; a backslash starting no such escape, as typed in an address, is read
 * as it is.
 */
export const text: Leaf<string> = leaf({
  expected: "any text",
  parse: (written) =>
    written.replace(ESCAPE, (_, escape: string) => (escape === "\\" ? "\\" : String.fromCharCode(parseInt(escape.slice(1), 16)))),
  format: (value) =>
    value.replace(UNWRITABLE, (match) => (match === "\\" ? "\\\\" : `\\u${match.charCodeAt(0).toString(16).toUpperCase()}`)),
});
