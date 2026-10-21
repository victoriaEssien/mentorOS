import { describe, expect, it } from "vitest";

import { readUnsubscribeToken, signUnsubscribeToken } from "./unsubscribe-token";

const secret = "a-test-secret-that-is-long-enough-to-sign";

describe("unsubscribe tokens", () => {
  it("round-trips who and which emails", () => {
    const token = signUnsubscribeToken("user-1", "weekly", secret);
    expect(readUnsubscribeToken(token, secret)).toEqual({ userId: "user-1", topic: "weekly" });
  });

  it("rejects a token signed with another secret", () => {
    const token = signUnsubscribeToken("user-1", "reminders", secret);
    expect(readUnsubscribeToken(token, "a-different-secret-entirely-for-testing")).toBeNull();
  });

  it("rejects a token whose user or topic was swapped", () => {
    const [, signature] = signUnsubscribeToken("user-1", "weekly", secret).split(".");
    const forged = Buffer.from(JSON.stringify({ u: "user-2", t: "weekly" })).toString("base64url");
    expect(readUnsubscribeToken(`${forged}.${signature}`, secret)).toBeNull();
  });

  it("rejects malformed tokens and unknown topics", () => {
    expect(readUnsubscribeToken("", secret)).toBeNull();
    expect(readUnsubscribeToken("only-one-part", secret)).toBeNull();
    expect(readUnsubscribeToken("a.b.c", secret)).toBeNull();
    const payload = Buffer.from(JSON.stringify({ u: "user-1", t: "marketing" })).toString("base64url");
    const token = signUnsubscribeToken("user-1", "weekly", secret);
    expect(readUnsubscribeToken(`${payload}.${token.split(".")[1]}`, secret)).toBeNull();
  });
});
