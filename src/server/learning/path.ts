import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import { db } from "@/db";
import { learningPath, learningPathItem, userTrack } from "@/db/schema";
import { buildLearnerContext } from "@/server/ai/context";
import { AiGenerationError } from "@/server/ai/generate";
import { planLearningPath } from "@/server/ai/modules/learning-planner";
import { getPrerequisiteEdges, getTaxonomy, getTrackSkills } from "@/server/queries/skills";

import { blockedSkills } from "./readiness";

/**
 * Plans a new learning path (PRD §12, §17) and makes it the active one. The previous path is
 * archived, never edited, so how the path changed over time stays visible.
 */
export async function planPath(
  userId: string,
  learnerRequest: string | null = null,
): Promise<{ pathId: string }> {
  const tracks = await db
    .select({ id: userTrack.trackId })
    .from(userTrack)
    .where(eq(userTrack.userId, userId));
  const [context, trackSkills, edges, { skills }] = await Promise.all([
    buildLearnerContext(userId),
    getTrackSkills(tracks.map((t) => t.id)),
    getPrerequisiteEdges(),
    getTaxonomy(),
  ]);

  const nameById = new Map(skills.map((s) => [s.id, s.name]));
  const nameBySlug = new Map(skills.map((s) => [s.slug, s.name]));
  const idBySlug = new Map(skills.map((s) => [s.slug, s.id]));
  const estimates = new Map(context.skills.map((s) => [s.slug, s]));

  const blocked = blockedSkills(
    trackSkills.map((s) => s.slug),
    edges,
    estimates,
  );
  const blockedSlugs = new Set(blocked.map((b) => b.skill));

  const { plan, meta } = await planLearningPath({
    context,
    learnerRequest,
    candidates: trackSkills
      .filter((s) => !blockedSlugs.has(s.slug))
      .map((s) => ({
        slug: s.slug,
        name: s.name,
        group: nameById.get(s.parentId) ?? null,
        estimate: estimates.get(s.slug) ?? null,
      })),
    blocked: blocked.map((b) => ({
      slug: b.skill,
      name: nameBySlug.get(b.skill) ?? b.skill,
      waitingOn: b.missing,
    })),
  });
  if (plan.items.length === 0) {
    throw new AiGenerationError("learning-planner", "the plan had nothing that could be scheduled now");
  }

  const pathId = crypto.randomUUID();
  const now = new Date();
  const rows = [
    ...plan.items.map((item, index) => ({
      status: index === 0 ? ("current" as const) : ("upcoming" as const),
      unlockWhen: null,
      ...item,
    })),
    ...plan.deferred.map((item) => ({ status: "deferred" as const, ...item })),
  ];

  await db.batch([
    db
      .update(learningPath)
      .set({ archivedAt: now })
      .where(and(eq(learningPath.userId, userId), isNull(learningPath.archivedAt))),
    db.insert(learningPath).values({
      id: pathId,
      userId,
      focusSummary: plan.focusSummary,
      request: learnerRequest,
      model: meta.model,
      promptVersion: meta.promptVersion,
      createdAt: now,
    }),
    db.insert(learningPathItem).values(
      rows.map((row, order) => ({
        pathId,
        skillId: row.skill ? (idBySlug.get(row.skill) ?? null) : null,
        title: row.title,
        reason: row.reason,
        unlockWhen: row.unlockWhen,
        status: row.status,
        order,
      })),
    ),
  ]);

  console.info(
    JSON.stringify({
      event: "path.planned",
      pathId,
      items: plan.items.length,
      deferred: plan.deferred.length,
      blocked: blocked.length,
      requested: Boolean(learnerRequest),
    }),
  );
  return { pathId };
}

/** Whether the learner has a path to follow right now. */
export async function hasActivePath(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: learningPath.id })
    .from(learningPath)
    .where(and(eq(learningPath.userId, userId), isNull(learningPath.archivedAt)))
    .limit(1);
  return Boolean(row);
}

/**
 * When the mission for a path step passes: the step is done and the next one becomes the focus.
 * Returned as statements so they commit with the evaluation that earned them. `finished` means
 * the path has no steps left and should be planned again.
 */
export async function completePathStep(
  pathItemId: string | null,
): Promise<{ statements: BatchItem<"pg">[]; finished: boolean }> {
  const none = { statements: [], finished: false };
  if (!pathItemId) return none;

  const [step] = await db
    .select({
      pathId: learningPathItem.pathId,
      status: learningPathItem.status,
      archivedAt: learningPath.archivedAt,
    })
    .from(learningPathItem)
    .innerJoin(learningPath, eq(learningPath.id, learningPathItem.pathId))
    .where(eq(learningPathItem.id, pathItemId))
    .limit(1);
  if (!step || step.status !== "current" || step.archivedAt) return none;

  const [next] = await db
    .select({ id: learningPathItem.id })
    .from(learningPathItem)
    .where(and(eq(learningPathItem.pathId, step.pathId), eq(learningPathItem.status, "upcoming")))
    .orderBy(asc(learningPathItem.order))
    .limit(1);

  return {
    statements: [
      db.update(learningPathItem).set({ status: "completed" }).where(eq(learningPathItem.id, pathItemId)),
      ...(next
        ? [db.update(learningPathItem).set({ status: "current" }).where(eq(learningPathItem.id, next.id))]
        : []),
    ],
    finished: !next,
  };
}
