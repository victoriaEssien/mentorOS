import { beforeEach, describe, expect, it, vi } from "vitest";

import { readUnsubscribeToken } from "@/lib/unsubscribe-token";
import { take } from "@/server/throttle";

import { confirmEmail, resetPasswordEmail, sendLinkEmail } from "./account-emails";
import { dailyEmail, weeklyProgressEmail, type DailyDigest, type WeeklyDigest } from "./engagement-emails";
import { escapeHtml, renderEmail } from "./layout";
import { sendEmail } from "./send";

const SECRET = "a-test-secret-for-signing-unsubscribe-links";

vi.mock("@/lib/env", () => ({
  env: {
    BETTER_AUTH_URL: "https://mentoros.test",
    BETTER_AUTH_SECRET: "a-test-secret-for-signing-unsubscribe-links",
  },
}));
vi.mock("@/server/throttle", () => ({ take: vi.fn() }));
vi.mock("./send", () => ({ sendEmail: vi.fn() }));

const learner = { userId: "user-1", name: "Ada Lovelace", email: "ada@example.com" };

/** The token in a one-click List-Unsubscribe header, read back. */
function oneClickToken(header: string | undefined) {
  const url = new URL(header!.slice(1, -1));
  expect(url.pathname).toBe("/api/email/unsubscribe");
  return readUnsubscribeToken(url.searchParams.get("token")!, SECRET);
}

describe("renderEmail", () => {
  it("escapes everything a learner or a model wrote", () => {
    const { html } = renderEmail({
      preheader: "x",
      title: "<script>alert(1)</script>",
      blocks: [
        { kind: "text", text: `Tom & "Jerry"` },
        { kind: "list", items: ["<b>bold</b>"] },
      ],
      action: { label: "Go <now>", url: `https://mentoros.test/a?b=1&c="2"` },
      reason: "Because.",
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("Tom &amp; &quot;Jerry&quot;");
    expect(html).toContain("&lt;b&gt;bold&lt;/b&gt;");
    expect(html).toContain(`href="https://mentoros.test/a?b=1&amp;c=&quot;2&quot;"`);
  });

  it("keeps the plain-text version readable, with the link as is", () => {
    const { text } = renderEmail({
      preheader: "x",
      title: "Reset your password",
      blocks: [{ kind: "text", text: "Tap the button." }],
      action: { label: "Choose a new password", url: "https://mentoros.test/r?t=1&u=2" },
      reason: "Because.",
    });
    expect(text).toContain("Reset your password");
    expect(text).toContain("https://mentoros.test/r?t=1&u=2");
    expect(text).not.toContain("&amp;");
  });

  it("only offers a way out on the emails that can be turned off", () => {
    const base = { preheader: "x", title: "t", blocks: [], reason: "r" };
    expect(renderEmail(base).html).not.toContain("Email settings");
    const { html, text } = renderEmail({
      ...base,
      unsubscribe: {
        label: "Stop reminders",
        url: "https://mentoros.test/u",
        settingsUrl: "https://mentoros.test/s",
      },
    });
    expect(html).toContain("Stop reminders");
    expect(text).toContain("https://mentoros.test/u");
  });

  it("escapes the five characters that matter in HTML", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  });
});

describe("account emails", () => {
  it("carry their link in both versions", () => {
    const url = "https://mentoros.test/api/auth/verify-email?token=abc&callbackURL=%2Ftoday";
    const email = confirmEmail({ name: "Ada Lovelace", email: "ada@example.com" }, url);
    expect(email.kind).toBe("confirm");
    expect(email.text).toContain(url);
    expect(email.html).toContain(escapeHtml(url));
    expect(email.text).toContain("Hi Ada,");
  });

  it("can't be unsubscribed from", () => {
    const email = resetPasswordEmail({ name: null, email: "x@example.com" }, "https://mentoros.test/r");
    expect(email.headers).toBeUndefined();
    expect(email.text).toContain("Hi there,");
  });
});

describe("sendLinkEmail", () => {
  const email = confirmEmail({ name: "Ada", email: "ada@example.com" }, "https://mentoros.test/v");

  beforeEach(() => {
    vi.mocked(take).mockReset();
    vi.mocked(sendEmail).mockReset();
  });

  it("counts each link against the account and kind", async () => {
    vi.mocked(take).mockResolvedValue(true);
    await sendLinkEmail("user-1", email);
    expect(take).toHaveBeenCalledWith("email:confirm:user-1", { max: 3, perSeconds: 3600 });
    expect(sendEmail).toHaveBeenCalledWith(email);
  });

  it("drops the link once the hour's share is used", async () => {
    vi.mocked(take).mockResolvedValue(false);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await sendLinkEmail("user-1", email);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("still sends when the count can't be kept", async () => {
    vi.mocked(take).mockRejectedValue(new Error("database unreachable"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await sendLinkEmail("user-1", email);
    expect(sendEmail).toHaveBeenCalledWith(email);
  });
});

describe("weeklyProgressEmail", () => {
  const digest: WeeklyDigest = {
    concepts: [
      { title: "Idempotency <keys>", verdict: "solid" },
      { title: "Status codes", verdict: "partly" },
    ],
    project: { title: "A rate-limited API", status: "in progress" },
    theme: "HTTP and APIs",
  };

  it("unsubscribes in one click from the weekly topic only", () => {
    const email = weeklyProgressEmail(learner, digest, "2026-10-19");
    expect(email.headers?.["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(oneClickToken(email.headers?.["List-Unsubscribe"])).toEqual({ userId: "user-1", topic: "weekly" });
    expect(email.html).toContain("https://mentoros.test/unsubscribe?token=");
  });

  it("sends once per learner per week, even if the job runs twice", () => {
    expect(weeklyProgressEmail(learner, digest, "2026-10-19").idempotencyKey).toBe(
      "weekly/user-1/2026-10-19",
    );
  });

  it("lists the week's concepts with their verdicts, escaped", () => {
    const email = weeklyProgressEmail(learner, digest, "2026-10-19");
    expect(email.text).toContain("You explained 2 concepts:");
    expect(email.text).toContain("Idempotency <keys>, solid");
    expect(email.text).toContain("Status codes, partly there");
    expect(email.html).toContain("Idempotency &lt;keys&gt;");
    expect(email.text).toContain("1 of them come back soon");
  });

  it("says where the project stands and what the theme is", () => {
    const { text } = weeklyProgressEmail(learner, digest, "2026-10-19");
    expect(text).toContain("Project: A rate-limited API, in progress.");
    expect(text).toContain("This week's theme: HTTP and APIs.");
  });

  it("still has something to say after a quiet week", () => {
    const { text } = weeklyProgressEmail(learner, { concepts: [], project: null, theme: "Databases" }, "2026-10-19");
    expect(text).toContain("No concepts explained last week.");
    expect(text).not.toContain("Project:");
  });
});

describe("dailyEmail", () => {
  const digest: DailyDigest = {
    theme: "HTTP and APIs",
    newConcept: "Idempotency keys",
    reviewsDue: 2,
    yesterday: [{ title: "Status codes", verdict: "not_yet" }],
    daysAway: 1,
    project: { title: "A rate-limited API", daysLeft: 3 },
  };

  it("leads with today's concept and unsubscribes from the daily email only", () => {
    const email = dailyEmail(learner, digest, "2026-10-21");
    expect(email.subject).toBe("Today's concept: Idempotency keys");
    expect(email.idempotencyKey).toBe("daily/user-1/2026-10-21");
    expect(oneClickToken(email.headers?.["List-Unsubscribe"])).toEqual({
      userId: "user-1",
      topic: "reminders",
    });
    expect(email.text).toContain("https://mentoros.test/today");
  });

  it("says how yesterday went, what's due and the project's time left", () => {
    const { text } = dailyEmail(learner, digest, "2026-10-21");
    expect(text).toContain("Yesterday you explained:");
    expect(text).toContain("Status codes, not yet");
    expect(text).toContain("Today, from HTTP and APIs: Idempotency keys (new) and 2 reviews.");
    expect(text).toContain("Project: A rate-limited API, 3 days left.");
    expect(text).not.toContain("One email a day");
  });

  it("keeps coming after time away, and says how long it's been", () => {
    const { text } = dailyEmail(learner, { ...digest, yesterday: [], daysAway: 9, project: null }, "2026-10-21");
    expect(text).toContain("It's been 9 days.");
    expect(text).not.toContain("Project:");
  });

  it("names the reviews when there's no new concept left in the theme", () => {
    const email = dailyEmail(learner, { ...digest, newConcept: null, reviewsDue: 1 }, "2026-10-21");
    expect(email.subject).toBe("1 review due today");
    expect(email.text).toContain("Today, from HTTP and APIs: 1 review.");
  });
});
