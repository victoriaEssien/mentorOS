import "server-only";
import { eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import { db } from "@/db";
import { learnerProfile, userTrack } from "@/db/schema";

export type LearnerSettings = {
  trackIds: string[];
  goals: string[];
  customGoal: string | null;
  weeklyLearningHours: number | null;
  learningStyle: string | null;
  mentorTone: "direct" | "balanced" | "supportive";
};

/**
 * Changes what the learner told us at onboarding, one setting or several at a time, in one
 * transaction. Says whether their tracks actually changed: the path is planned from the tracks'
 * skills, so a change there means the path should be planned again.
 */
export async function updateLearnerSettings(
  userId: string,
  changes: Partial<LearnerSettings>,
): Promise<{ tracksChanged: boolean }> {
  const { trackIds, ...profile } = changes;
  const statements: BatchItem<"pg">[] = [];

  if (Object.keys(profile).length > 0) {
    statements.push(db.update(learnerProfile).set(profile).where(eq(learnerProfile.userId, userId)));
  }

  let tracksChanged = false;
  if (trackIds) {
    const current = await db
      .select({ trackId: userTrack.trackId })
      .from(userTrack)
      .where(eq(userTrack.userId, userId));
    const before = new Set(current.map((row) => row.trackId));
    const after = new Set(trackIds);
    tracksChanged = after.size !== before.size || [...after].some((id) => !before.has(id));
    if (tracksChanged) {
      statements.push(
        db.delete(userTrack).where(eq(userTrack.userId, userId)),
        db.insert(userTrack).values([...after].map((trackId) => ({ userId, trackId }))),
      );
    }
  }

  if (statements.length > 0) {
    await db.batch(statements as [BatchItem<"pg">, ...BatchItem<"pg">[]]);
  }
  return { tracksChanged };
}
