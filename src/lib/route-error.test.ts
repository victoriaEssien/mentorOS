import { describe, expect, it } from "vitest";

import { routeErrorMessage } from "./route-error";

describe("routeErrorMessage", () => {
  it("shows the route's own words", () => {
    const error = new Error(JSON.stringify({ error: "That's all 5 hints for this question." }));
    expect(routeErrorMessage(error, "fallback")).toBe("That's all 5 hints for this question.");
  });

  it("falls back when the body has no error text", () => {
    expect(routeErrorMessage(new Error(JSON.stringify({ ok: false })), "fallback")).toBe("fallback");
  });

  it("falls back when the failure wasn't the route's JSON", () => {
    expect(routeErrorMessage(new Error("Failed to fetch"), "fallback")).toBe("fallback");
  });
});
