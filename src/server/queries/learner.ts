import "server-only";
import { and, count, countDistinct, eq, isNotNull } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/db";
import { account, conceptAttempt, emailSettings, evaluation, learnerProfile, themeRun } from "@/db/schema";

/**
 * Read-only queries for pages. Writes to learner state go through src/server/learning only.
 */

/** Onboarding context for a learner, or null before onboarding has started. */
export const getLearnerProfile = cache(async (userId: string) => {
  const [row] = await db.select().from(learnerProfile).where(eq(learnerProfile.userId, userId)).limit(1);
  return row ?? null;
});

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

/** Plain counts of what they've done: concepts explained, explanations written, projects, themes. */
export async function getLearnerSummary(userId: string) {
  const [[concepts], [projects], [themes]] = await Promise.all([
    db
      .select({ distinct: countDistinct(conceptAttempt.conceptSlug), all: count() })
      .from(conceptAttempt)
      .where(and(eq(conceptAttempt.userId, userId), isNotNull(conceptAttempt.explainedAt))),
    db
      .select({ reviewed: count() })
      .from(evaluation)
      .where(and(eq(evaluation.userId, userId), isNotNull(evaluation.submissionId))),
    db.select({ started: count() }).from(themeRun).where(eq(themeRun.userId, userId)),
  ]);
  return {
    conceptsExplained: Number(concepts?.distinct ?? 0),
    explanations: Number(concepts?.all ?? 0),
    projectsReviewed: Number(projects?.reviewed ?? 0),
    themesStarted: Number(themes?.started ?? 0),
  };
}
