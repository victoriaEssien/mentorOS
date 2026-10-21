import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * The emails someone can turn off. Account emails (confirming an address, resetting a password,
 * a changed password) aren't optional and have no token.
 */
export const EMAIL_TOPICS = ["weekly", "reminders"] as const;
export type EmailTopic = (typeof EMAIL_TOPICS)[number];

/**
 * Unsubscribe links work without signing in, so the link itself is the proof: who and what,
 * signed with the server's secret. They never expire, because an old email's link should still
 * work. Tampering with either part breaks the signature.
 */
export function signUnsubscribeToken(userId: string, topic: EmailTopic, secret: string): string {
  const payload = Buffer.from(JSON.stringify({ u: userId, t: topic })).toString("base64url");
  return `${payload}.${signature(payload, secret)}`;
}

export function readUnsubscribeToken(
  token: string,
  secret: string,
): { userId: string; topic: EmailTopic } | null {
  const [payload, given, ...rest] = token.split(".");
  if (!payload || !given || rest.length > 0) return null;

  const expected = Buffer.from(signature(payload, secret));
  const actual = Buffer.from(given);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const { u, t } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      u?: unknown;
      t?: unknown;
    };
    if (typeof u !== "string" || !u || !EMAIL_TOPICS.includes(t as EmailTopic)) return null;
    return { userId: u, topic: t as EmailTopic };
  } catch {
    return null;
  }
}

function signature(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(`unsubscribe:${payload}`).digest("base64url");
}
