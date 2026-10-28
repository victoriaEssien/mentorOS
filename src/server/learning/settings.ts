import "server-only";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { learnerProfile } from "@/db/schema";

export type LearnerSettings = {
  goals: string[];
  customGoal: string | null;
  weeklyLearningHours: number | null;
  learningStyle: string | null;
  mentorTone: "direct" | "balanced" | "supportive";
};

/**
 * Changes what the learner told us at onboarding, one setting or several at a time. Tracks aren't
 * among them: every learner learns the same active tracks.
 */
export async function updateLearnerSettings(
  userId: string,
  changes: Partial<LearnerSettings>,
): Promise<void> {
  if (Object.keys(changes).length === 0) return;
  await db.update(learnerProfile).set(changes).where(eq(learnerProfile.userId, userId));
}
