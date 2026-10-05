import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn", () => {
  it("keeps a colour next to a custom type-scale size", () => {
    expect(cn("text-signal-foreground", "text-headline")).toBe("text-signal-foreground text-headline");
  });

  it("still lets a later size replace an earlier one", () => {
    expect(cn("text-callout", "text-footnote")).toBe("text-footnote");
    expect(cn("text-callout", "text-lg")).toBe("text-lg");
  });
});
