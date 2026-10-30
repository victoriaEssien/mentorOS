import "server-only";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { conceptAttempt, conceptSchedule, learnerProfile, mentorConversation, mission, themeRun } from "@/db/schema";

/**
 * Starts a learner over: every concept, review, theme, project and mentor thread goes, and they go
 * back through onboarding with their answers kept to edit. Their account, sign-in and email choices
 * stay, and so do concepts, which everyone shares. Can't be undone.
 */
export async function resetLearning(userId: string): Promise<void> {
  await db.batch([
    db.delete(conceptAttempt).where(eq(conceptAttempt.userId, userId)),
    db.delete(conceptSchedule).where(eq(conceptSchedule.userId, userId)),
    db.delete(themeRun).where(eq(themeRun.userId, userId)),
    // Hand-ins, their reviews and project posts go with the projects.
    db.delete(mission).where(eq(mission.userId, userId)),
    db.delete(mentorConversation).where(eq(mentorConversation.userId, userId)),
    db.update(learnerProfile).set({ onboardingCompletedAt: null }).where(eq(learnerProfile.userId, userId)),
  ]);
  console.info(JSON.stringify({ event: "learner.started_over" }));
}
