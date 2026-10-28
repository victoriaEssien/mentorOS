import { describe, expect, it } from "vitest";

import { normalizeOutput, sameOutput } from "./code-languages";

describe("sameOutput", () => {
  it("ignores line endings, trailing spaces and trailing blank lines", () => {
    expect(sameOutput("1 2 3 \r\n4\r\n\r\n", "1 2 3\n4")).toBe(true);
    expect(sameOutput("yes\n", "yes")).toBe(true);
  });

  it("still requires leading spaces, inner spaces and every line to match", () => {
    expect(sameOutput(" 1", "1")).toBe(false);
    expect(sameOutput("1  2", "1 2")).toBe(false);
    expect(sameOutput("1\n2", "1")).toBe(false);
  });

  it("treats empty output and blank lines alike", () => {
    expect(normalizeOutput("\n\n")).toBe("");
    expect(sameOutput("", "\n")).toBe(true);
  });
});
