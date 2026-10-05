import "server-only";
import { eq } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/db";
import { learnerProfile } from "@/db/schema";

/**
 * Read-only queries for pages. Writes to learner state go through src/server/learning only.
 */

/** Onboarding context for a learner, or null before onboarding has started. */
export const getLearnerProfile = cache(async (userId: string) => {
  const [row] = await db.select().from(learnerProfile).where(eq(learnerProfile.userId, userId)).limit(1);
  return row ?? null;
});
