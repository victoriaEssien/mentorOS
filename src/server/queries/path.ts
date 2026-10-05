import "server-only";
import { and, desc, eq, isNotNull } from "drizzle-orm";

import { db } from "@/db";
import { assessment, assessmentAttempt, learningPath, learningPathItem, skill, userSkill } from "@/db/schema";

/**
 * The learner's active path with its items (and the current estimate for each item's skill), the
 * versions it replaced, and whether the first path is still being planned (in the background,
 * right after the diagnostic) so the screen can say it is on its way.
 */
/** How long after the diagnostic the first path can still be on its way. */
const FIRST_PATH_WINDOW_MS = 3 * 60_000;

export async function getPathOverview(userId: string) {
  const [paths, [diagnostic]] = await Promise.all([
    db
      .select({
        id: learningPath.id,
        focusSummary: learningPath.focusSummary,
        request: learningPath.request,
        archivedAt: learningPath.archivedAt,
        createdAt: learningPath.createdAt,
      })
      .from(learningPath)
      .where(eq(learningPath.userId, userId))
      .orderBy(desc(learningPath.createdAt))
      .limit(6),
    db
      .select({ completedAt: assessmentAttempt.completedAt })
      .from(assessmentAttempt)
      .innerJoin(assessment, eq(assessment.id, assessmentAttempt.assessmentId))
      .where(
        and(
          eq(assessmentAttempt.userId, userId),
          eq(assessment.kind, "diagnostic"),
          isNotNull(assessmentAttempt.completedAt),
        ),
      )
      .orderBy(desc(assessmentAttempt.completedAt))
      .limit(1),
  ]);

  const active = paths.find((path) => path.archivedAt === null) ?? null;
  const items = active
    ? await db
        .select({
          id: learningPathItem.id,
          title: learningPathItem.title,
          reason: learningPathItem.reason,
          status: learningPathItem.status,
          unlockWhen: learningPathItem.unlockWhen,
          skill: { slug: skill.slug, name: skill.name },
          estimate: {
            ability: userSkill.ability,
            confidence: userSkill.confidence,
            evidenceCount: userSkill.evidenceCount,
          },
        })
        .from(learningPathItem)
        .leftJoin(skill, eq(skill.id, learningPathItem.skillId))
        .leftJoin(
          userSkill,
          and(eq(userSkill.skillId, learningPathItem.skillId), eq(userSkill.userId, userId)),
        )
        .where(eq(learningPathItem.pathId, active.id))
        .orderBy(learningPathItem.order)
    : [];

  return {
    active,
    current: items.find((item) => item.status === "current") ?? null,
    steps: items.filter((item) => item.status !== "deferred"),
    deferred: items.filter((item) => item.status === "deferred"),
    earlier: paths.filter((path) => path.archivedAt !== null),
    // The first path is planned in the background right after the diagnostic is graded.
    firstPathOnItsWay:
      !active &&
      diagnostic?.completedAt != null &&
      Date.now() - diagnostic.completedAt.getTime() < FIRST_PATH_WINDOW_MS,
  };
}

export type PathOverview = Awaited<ReturnType<typeof getPathOverview>>;

/** When the learner's latest path was planned, active or not. */
export async function getLastPlannedAt(userId: string): Promise<Date | null> {
  const [latest] = await db
    .select({ createdAt: learningPath.createdAt })
    .from(learningPath)
    .where(eq(learningPath.userId, userId))
    .orderBy(desc(learningPath.createdAt))
    .limit(1);
  return latest?.createdAt ?? null;
}
