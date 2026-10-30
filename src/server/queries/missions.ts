import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { evaluation, mission, missionSubmission } from "@/db/schema";
import type { SubmissionEvaluationResult } from "@/server/learning/submissions";

const IN_PLAY = ["assigned", "in_progress", "submitted"] as const;

/**
 * The projects tab: the project in play, the last one if it ran out of time (so its slot can say
 * "Project over" until a new one is written), and past projects. Old daily missions stay in the
 * database but no longer show.
 */
export async function getMissionsOverview(userId: string) {
  const rows = await db
    .select({
      id: mission.id,
      type: mission.type,
      cadence: mission.cadence,
      status: mission.status,
      title: mission.title,
      objective: mission.objective,
      reason: mission.reason,
      stack: mission.stack,
      requiredKnowledge: mission.requiredKnowledge,
      resources: mission.resources,
      estimatedMinutes: mission.estimatedMinutes,
      difficulty: mission.difficulty,
      dueAt: mission.dueAt,
      createdAt: mission.createdAt,
      updatedAt: mission.updatedAt,
    })
    .from(mission)
    .where(and(eq(mission.userId, userId), eq(mission.cadence, "weekly")))
    .orderBy(desc(mission.createdAt))
    .limit(30);

  const done = rows.filter((row) => !isInPlay(row.status));
  const outcomes = await latestOutcomes(done.map((row) => row.id));
  const latest = rows[0];

  return {
    weekly: rows.find((row) => isInPlay(row.status)) ?? null,
    weeklyOver: latest?.status === "expired" ? latest : null,
    done: done.slice(0, 20).map((row) => ({ ...row, outcome: outcomes.get(row.id) ?? null })),
  };
}

export type MissionsOverview = Awaited<ReturnType<typeof getMissionsOverview>>;

/** The current theme's project, whatever its state, for Today. */
export async function getThemeProject(userId: string, missionId: string | null) {
  if (!missionId) return null;
  const [row] = await db
    .select({
      id: mission.id,
      type: mission.type,
      cadence: mission.cadence,
      status: mission.status,
      title: mission.title,
      objective: mission.objective,
      reason: mission.reason,
      stack: mission.stack,
      requiredKnowledge: mission.requiredKnowledge,
      resources: mission.resources,
      estimatedMinutes: mission.estimatedMinutes,
      difficulty: mission.difficulty,
      dueAt: mission.dueAt,
      createdAt: mission.createdAt,
      updatedAt: mission.updatedAt,
    })
    .from(mission)
    .where(and(eq(mission.id, missionId), eq(mission.userId, userId)))
    .limit(1);
  return row ?? null;
}

/** One project in full, with its latest review. */
export async function getMissionDetail(userId: string, missionId: string) {
  if (!z.uuid().safeParse(missionId).success) return null;

  const [row] = await db
    .select()
    .from(mission)
    .where(and(eq(mission.id, missionId), eq(mission.userId, userId)))
    .limit(1);
  if (!row) return null;

  const [latest] = await db
    .select({ evaluationId: evaluation.id, outcome: evaluation.outcome })
    .from(missionSubmission)
    .innerJoin(evaluation, eq(evaluation.submissionId, missionSubmission.id))
    .where(eq(missionSubmission.missionId, missionId))
    .orderBy(desc(evaluation.createdAt))
    .limit(1);

  return { mission: row, evaluation: latest ?? null };
}

export type MissionDetail = NonNullable<Awaited<ReturnType<typeof getMissionDetail>>>;

function isInPlay(status: string) {
  return (IN_PLAY as readonly string[]).includes(status);
}

async function latestOutcomes(missionIds: string[]) {
  if (missionIds.length === 0) return new Map<string, (typeof evaluation.$inferSelect)["outcome"]>();
  const rows = await db
    .select({ missionId: missionSubmission.missionId, outcome: evaluation.outcome })
    .from(evaluation)
    .innerJoin(missionSubmission, eq(evaluation.submissionId, missionSubmission.id))
    .where(inArray(missionSubmission.missionId, missionIds))
    .orderBy(desc(evaluation.createdAt));
  const outcomes = new Map<string, (typeof rows)[number]["outcome"]>();
  for (const row of rows) if (!outcomes.has(row.missionId)) outcomes.set(row.missionId, row.outcome);
  return outcomes;
}

/**
 * The latest review of a project, with each criterion's label and maximum from the brief. Null when
 * the project isn't the learner's or hasn't been reviewed.
 */
export async function getMissionEvaluation(userId: string, missionId: string) {
  if (!z.uuid().safeParse(missionId).success) return null;

  const [row] = await db
    .select({
      mission: {
        id: mission.id,
        title: mission.title,
        cadence: mission.cadence,
        status: mission.status,
        evaluationCriteria: mission.evaluationCriteria,
      },
      evaluation: {
        id: evaluation.id,
        outcome: evaluation.outcome,
        result: evaluation.result,
        createdAt: evaluation.createdAt,
      },
    })
    .from(mission)
    .innerJoin(missionSubmission, eq(missionSubmission.missionId, mission.id))
    .innerJoin(evaluation, eq(evaluation.submissionId, missionSubmission.id))
    .where(and(eq(mission.id, missionId), eq(mission.userId, userId)))
    .orderBy(desc(evaluation.createdAt))
    .limit(1);
  if (!row) return null;

  const result = row.evaluation.result as SubmissionEvaluationResult;
  const labelByKey = new Map(row.mission.evaluationCriteria.map((c) => [c.key, c]));

  return {
    mission: row.mission,
    outcome: row.evaluation.outcome,
    evaluatedAt: row.evaluation.createdAt,
    score: result.score,
    criteria: result.criteria.map((c) => ({
      ...c,
      label: labelByKey.get(c.key)?.label ?? c.key,
      maxScore: labelByKey.get(c.key)?.maxScore ?? 10,
    })),
    strengths: result.strengths,
    weaknesses: result.weaknesses,
    why: result.why,
    next: result.recommendedNextStep,
    unseen: result.unseen,
    links: result.links,
  };
}

export type MissionEvaluationView = NonNullable<Awaited<ReturnType<typeof getMissionEvaluation>>>;
