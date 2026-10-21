import { describe, expect, it } from "vitest";

import { safeNext } from "./safe-next";

describe("safeNext", () => {
  it("keeps same-origin paths", () => {
    expect(safeNext("/missions/abc")).toBe("/missions/abc");
    expect(safeNext("/path?tab=deferred")).toBe("/path?tab=deferred");
  });

  it("rejects anything that could leave the site", () => {
    expect(safeNext("https://evil.example")).toBe("/today");
    expect(safeNext("//evil.example")).toBe("/today");
    expect(safeNext("/\\evil.example")).toBe("/today");
    expect(safeNext("missions")).toBe("/today");
  });

  it("falls back for missing or non-string values", () => {
    expect(safeNext(undefined)).toBe("/today");
    expect(safeNext(null)).toBe("/today");
    expect(safeNext(["/missions"])).toBe("/today");
    expect(safeNext(undefined, "/onboarding")).toBe("/onboarding");
  });
});
