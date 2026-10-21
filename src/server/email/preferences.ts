import "server-only";

import { db } from "@/db";
import { emailSettings } from "@/db/schema";
import { isForeignKeyViolation } from "@/db/errors";
import { env } from "@/lib/env";
import { readUnsubscribeToken, type EmailTopic } from "@/lib/unsubscribe-token";

/** Turns weekly progress or reminders on or off for one learner. */
export async function setEmailTopic(userId: string, topic: EmailTopic, on: boolean): Promise<void> {
  const change = topic === "weekly" ? { weeklyProgress: on } : { reminders: on };
  await db
    .insert(emailSettings)
    .values({ userId, ...change })
    .onConflictDoUpdate({ target: emailSettings.userId, set: change });
}

/** Which emails an unsubscribe link is for, or null when the link isn't one of ours. */
export function unsubscribeTopic(token: string): EmailTopic | null {
  return readUnsubscribeToken(token, env.BETTER_AUTH_SECRET)?.topic ?? null;
}

/**
 * Acts on an unsubscribe link, signed in or not. A link for an account that no longer exists
 * still counts as done: there's nobody left to email.
 */
export async function unsubscribeWithToken(token: string): Promise<EmailTopic | null> {
  const read = readUnsubscribeToken(token, env.BETTER_AUTH_SECRET);
  if (!read) return null;
  try {
    await setEmailTopic(read.userId, read.topic, false);
  } catch (error) {
    if (!isForeignKeyViolation(error)) throw error;
  }
  return read.topic;
}
