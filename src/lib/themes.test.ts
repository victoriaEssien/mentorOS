import { describe, expect, it } from "vitest";

import { findConcept, nextTheme, THEMES } from "./themes";

describe("the curriculum", () => {
  it("gives every theme one concept a day for its weeks", () => {
    for (const theme of THEMES) expect(theme.concepts).toHaveLength(theme.weeks * 7);
  });

  it("has unique theme and concept slugs", () => {
    expect(new Set(THEMES.map((t) => t.slug)).size).toBe(THEMES.length);
    const concepts = THEMES.flatMap((t) => t.concepts.map((c) => c.slug));
    expect(new Set(concepts).size).toBe(concepts.length);
  });

  it("links official docs for payments, auth and client-side security", () => {
    for (const slug of ["payments", "auth", "client-security"]) {
      expect(THEMES.find((t) => t.slug === slug)!.docs.length).toBeGreaterThan(0);
    }
  });
});

describe("nextTheme", () => {
  it("starts at the top and walks the order", () => {
    expect(nextTheme(null).slug).toBe("http-apis");
    expect(nextTheme("http-apis").slug).toBe("databases");
  });

  it("starts again once the curriculum runs out", () => {
    expect(nextTheme(THEMES.at(-1)!.slug).slug).toBe("http-apis");
  });
});

describe("findConcept", () => {
  it("finds a concept and its theme", () => {
    expect(findConcept("card-payment-flow")?.theme.slug).toBe("payments");
    expect(findConcept("nope")).toBeNull();
  });
});
