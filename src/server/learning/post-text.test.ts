import { describe, expect, it } from "vitest";

import { tidyPost, X_LIMIT } from "./post-text";

describe("tidyPost", () => {
  it("swaps em dashes for commas and trims", () => {
    expect(tidyPost({ linkedin: "  Built it — in Go.  ", x: "Done — finally" })).toEqual({
      linkedin: "Built it, in Go.",
      x: "Done, finally",
    });
  });

  it("keeps an X post within the limit, at a sentence when it can", () => {
    const long = `${"First sentence that runs on for a while. ".repeat(6)}Second part keeps going and going.`;
    const fitted = tidyPost({ linkedin: "", x: long }).x;
    expect([...fitted].length).toBeLessThanOrEqual(X_LIMIT);
    expect(fitted.endsWith(".")).toBe(true);
  });

  it("falls back to a word boundary with an ellipsis", () => {
    const fitted = tidyPost({ linkedin: "", x: "word ".repeat(80) }).x;
    expect([...fitted].length).toBeLessThanOrEqual(X_LIMIT);
    expect(fitted.endsWith("…")).toBe(true);
  });
});
