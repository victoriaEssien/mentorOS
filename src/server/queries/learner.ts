import "server-only";
import { and, eq } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/db";
import { account, emailSettings, learnerProfile, userTrack } from "@/db/schema";

/**
 * Read-only queries for pages. Writes to learner state go through src/server/learning only.
 */

/** Onboarding context for a learner, or null before onboarding has started. */
export const getLearnerProfile = cache(async (userId: string) => {
  const [row] = await db.select().from(learnerProfile).where(eq(learnerProfile.userId, userId)).limit(1);
  return row ?? null;
});

/** The ids of the tracks the learner picked. */
export async function getLearnerTrackIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ trackId: userTrack.trackId })
    .from(userTrack)
    .where(eq(userTrack.userId, userId));
  return rows.map((row) => row.trackId);
}

/** Whether they can sign in with a password (they may use Google or GitHub only). */
export async function hasPassword(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "credential")))
    .limit(1);
  return Boolean(row);
}

/** Which optional emails they get. No row yet means both are on. */
export async function getEmailSettings(userId: string): Promise<{ weekly: boolean; reminders: boolean }> {
  const [row] = await db
    .select({ weekly: emailSettings.weeklyProgress, reminders: emailSettings.reminders })
    .from(emailSettings)
    .where(eq(emailSettings.userId, userId))
    .limit(1);
  return { weekly: row?.weekly ?? true, reminders: row?.reminders ?? true };
}
