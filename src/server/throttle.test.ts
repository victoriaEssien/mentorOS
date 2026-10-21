import { describe, expect, it, vi } from "vitest";

import { throttleKey } from "./throttle";

vi.mock("@/db", () => ({ db: {} }));
vi.mock("next/headers", () => ({ headers: vi.fn() }));

describe("throttleKey", () => {
  it("never keeps the address or email in the clear", () => {
    const key = throttleKey("sign-in:account", "ada@example.com");
    expect(key).toMatch(/^sign-in:account:[A-Za-z0-9_-]{22}$/);
    expect(key).not.toContain("ada");
  });

  it("treats case and stray spaces as the same account", () => {
    expect(throttleKey("sign-in:account", " Ada@Example.com ")).toBe(
      throttleKey("sign-in:account", "ada@example.com"),
    );
  });

  it("keeps actions apart", () => {
    expect(throttleKey("sign-up", "10.0.0.1")).not.toBe(throttleKey("reset-request", "10.0.0.1"));
  });
});
