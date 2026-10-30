import "server-only";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { projectPost } from "@/db/schema";

/** A project's drafted posts, if there are any yet. */
export async function getProjectPost(userId: string, missionId: string) {
  const [row] = await db
    .select({ linkedin: projectPost.linkedin, x: projectPost.x, drewOn: projectPost.drewOn })
    .from(projectPost)
    .where(and(eq(projectPost.userId, userId), eq(projectPost.missionId, missionId)))
    .limit(1);
  return row ?? null;
}
