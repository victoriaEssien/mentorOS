import { describe, expect, it } from "vitest";

import { oauthErrorMessage } from "./oauth-errors";

describe("oauthErrorMessage", () => {
  it("says nothing when there's no error", () => {
    expect(oauthErrorMessage(undefined)).toBeNull();
    expect(oauthErrorMessage("")).toBeNull();
  });

  it("tells someone with an email account to use their password", () => {
    expect(oauthErrorMessage("account_not_linked")).toMatch(/Sign in with your email and password/);
  });

  it("treats a cancelled sign-in as a choice, not a failure", () => {
    expect(oauthErrorMessage("access_denied")).toMatch(/You cancelled/);
  });

  it("reads the provider's code when the URL carries two errors", () => {
    expect(oauthErrorMessage(["oauth", "account_not_linked"])).toMatch(/already have a mentorOS account/);
  });

  it("falls back to one plain message for anything else", () => {
    expect(oauthErrorMessage("oauth")).toBe("That sign-in didn't finish. Try again, or use your email.");
    expect(oauthErrorMessage("invalid_code")).toBe(
      "That sign-in didn't finish. Try again, or use your email.",
    );
  });
});
