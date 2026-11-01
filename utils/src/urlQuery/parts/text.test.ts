import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { INVALID } from "../part.ts";
import { readK, writeK } from "../testing.ts";
import { text } from "./text.ts";

describe("text", () => {
  it("reads the text as written, spaces at its ends included", () => {
    assert.equal(readK(text, "k=brake+pads"), "brake pads");
    assert.equal(readK(text, "k=%20a%20"), " a ");
  });

  it("reads an empty text, and one of spaces, as it is, unlike a missing one", () => {
    assert.equal(readK(text, "k="), "");
    assert.equal(readK(text, "k"), "");
    assert.equal(readK(text, "k=%20%20"), "  ");
    assert.equal(readK(text, ""), INVALID);
  });

  it("reads back any text it writes", () => {
    for (const value of ["", "   ", "\t\n", " a & b = c? ", "zażółć", "-", "100%", "a+b", "#hash"]) {
      assert.equal(readK(text, writeK(text, value)), value, JSON.stringify(value));
    }
  });

  it("reads back a half of a character, and a backslash, through escapes", () => {
    const halves = [
      "😀",
      "a\uD83Db",
      "\uDE00",
      "\uDE00\uD83D",
      "\uD83D\uD83D\uDE00",
      "😀".slice(0, 1) + "😀",
      "C:\\dir",
      "\\\\",
      "\\uD83D",
      "\\\uD83D",
    ];

    for (const value of halves) {
      assert.equal(readK(text, writeK(text, value)), value, JSON.stringify(value));
    }
  });

  it("writes a whole character as it is, a half as \\uXXXX, and a backslash doubled", () => {
    assert.equal(new URLSearchParams(writeK(text, "😀")).get("k"), "😀");
    assert.equal(new URLSearchParams(writeK(text, "a\uD83Db")).get("k"), "a\\uD83Db");
    assert.equal(new URLSearchParams(writeK(text, "C:\\dir")).get("k"), "C:\\\\dir");
  });

  it("reads a backslash starting no escape as it is", () => {
    assert.equal(readK(text, "k=C:%5Cdir"), "C:\\dir");
    assert.equal(readK(text, "k=%5Cu0041"), "\\u0041");
    assert.equal(readK(text, "k=%5C"), "\\");
  });
});
