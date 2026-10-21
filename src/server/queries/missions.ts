import "server-only";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  evaluation,
  learningPath,
  mission,
  missionSkill,
  missionSubmission,
  skill,
  userSkill,
} from "@/db/schema";
import type { SubmissionEvaluationResult } from "@/server/learning/submissions";

import { getTaxonomy } from "./skills";

const IN_PLAY = ["assigned", "in_progress", "submitted"] as const;

/** The missions tab: what's in play for each cadence, what's done, and whether there's a path. */
export async function getMissionsOverview(userId: string) {
  const [rows, [path]] = await Promise.all([
    db
      .select({
        id: mission.id,
        type: mission.type,
        cadence: mission.cadence,
        status: mission.status,
        title: mission.title,
        objective: mission.objective,
        estimatedMinutes: mission.estimatedMinutes,
        difficulty: mission.difficulty,
        createdAt: mission.createdAt,
        updatedAt: mission.updatedAt,
      })
      .from(mission)
      .where(eq(mission.userId, userId))
      .orderBy(desc(mission.createdAt))
      .limit(30),
    db
      .select({ id: learningPath.id })
      .from(learningPath)
      .where(and(eq(learningPath.userId, userId), isNull(learningPath.archivedAt)))
      .limit(1),
  ]);

  const done = rows.filter((row) => row.status === "evaluated" || row.status === "skipped");
  const outcomes = await latestOutcomes(done.map((row) => row.id));

  return {
    hasPath: Boolean(path),
    daily: rows.find((row) => row.cadence === "daily" && isInPlay(row.status)) ?? null,
    weekly: rows.find((row) => row.cadence === "weekly" && isInPlay(row.status)) ?? null,
    done: done.slice(0, 12).map((row) => ({ ...row, outcome: outcomes.get(row.id) ?? null })),
  };
}

export type MissionsOverview = Awaited<ReturnType<typeof getMissionsOverview>>;

/** One mission in full, with its skills (and current estimates) and its latest evaluation. */
export async function getMissionDetail(userId: string, missionId: string) {
  if (!z.uuid().safeParse(missionId).success) return null;

  const [row] = await db
    .select()
    .from(mission)
    .where(and(eq(mission.id, missionId), eq(mission.userId, userId)))
    .limit(1);
  if (!row) return null;

  const [skills, [latest]] = await Promise.all([
    db
      .select({
        id: skill.id,
        slug: skill.slug,
        name: skill.name,
        estimate: {
          ability: userSkill.ability,
          confidence: userSkill.confidence,
          evidenceCount: userSkill.evidenceCount,
        },
      })
      .from(missionSkill)
      .innerJoin(skill, eq(skill.id, missionSkill.skillId))
      .leftJoin(userSkill, and(eq(userSkill.skillId, skill.id), eq(userSkill.userId, userId)))
      .where(eq(missionSkill.missionId, missionId)),
    db
      .select({ evaluationId: evaluation.id, outcome: evaluation.outcome })
      .from(missionSubmission)
      .innerJoin(evaluation, eq(evaluation.submissionId, missionSubmission.id))
      .where(eq(missionSubmission.missionId, missionId))
      .orderBy(desc(evaluation.createdAt))
      .limit(1),
  ]);

  return { mission: row, skills, evaluation: latest ?? null };
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
 * The latest evaluation of a mission, with each criterion's label and maximum from the mission,
 * and what it changed in the skill profile. Null when the mission isn't the learner's or hasn't
 * been evaluated.
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
  const { skills } = await getTaxonomy();
  const skillById = new Map(skills.map((s) => [s.id, s]));
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
    changes: result.changes.flatMap((change) => {
      const skill = skillById.get(change.skillId);
      return skill
        ? [{ slug: skill.slug, name: skill.name, before: change.before, after: change.after }]
        : [];
    }),
  };
}

export type MissionEvaluationView = NonNullable<Awaited<ReturnType<typeof getMissionEvaluation>>>;
