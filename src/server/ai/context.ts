import "server-only";
import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  assessment,
  assessmentAttempt,
  evaluation,
  learnerProfile,
  learningPath,
  learningPathItem,
  mission,
  missionSubmission,
  skill,
  track,
  user,
  userSkill,
  userTrack,
} from "@/db/schema";
import type { Outcome } from "@/server/learning/difficulty";

import { deriveMomentum, WEAK_ABILITY, WEAK_MIN_CONFIDENCE, type LearnerContext } from "./context-render";

export * from "./context-render";

const ACTIVE_MISSION = ["assigned", "in_progress", "submitted"] as const;

/** Builds the learner's context from the database. Called fresh for every AI call. */
export async function buildLearnerContext(userId: string): Promise<LearnerContext> {
  const [[account], [profile], tracks, skills, [path], missions, attempts, evaluations] = await Promise.all([
    db.select({ name: user.name }).from(user).where(eq(user.id, userId)).limit(1),
    db.select().from(learnerProfile).where(eq(learnerProfile.userId, userId)).limit(1),
    db
      .select({ slug: track.slug, name: track.name })
      .from(userTrack)
      .innerJoin(track, eq(userTrack.trackId, track.id))
      .where(eq(userTrack.userId, userId))
      .orderBy(track.sortOrder),
    db
      .select({
        skillId: userSkill.skillId,
        slug: skill.slug,
        name: skill.name,
        ability: userSkill.ability,
        confidence: userSkill.confidence,
        evidenceCount: userSkill.evidenceCount,
      })
      .from(userSkill)
      .innerJoin(skill, eq(userSkill.skillId, skill.id))
      .where(eq(userSkill.userId, userId))
      .orderBy(skill.sortOrder),
    db
      .select()
      .from(learningPath)
      .where(and(eq(learningPath.userId, userId), isNull(learningPath.archivedAt)))
      .orderBy(desc(learningPath.createdAt))
      .limit(1),
    db
      .select({
        id: mission.id,
        title: mission.title,
        type: mission.type,
        objective: mission.objective,
        status: mission.status,
        updatedAt: mission.updatedAt,
      })
      .from(mission)
      .where(eq(mission.userId, userId))
      .orderBy(desc(mission.createdAt))
      .limit(8),
    db
      .select({
        title: assessment.title,
        kind: assessment.kind,
        completedAt: assessmentAttempt.completedAt,
        score: sql<
          number | null
        >`(select avg(score) from assessment_response where attempt_id = ${assessmentAttempt.id})`,
      })
      .from(assessmentAttempt)
      .innerJoin(assessment, eq(assessmentAttempt.assessmentId, assessment.id))
      .where(and(eq(assessmentAttempt.userId, userId), isNotNull(assessmentAttempt.completedAt)))
      .orderBy(desc(assessmentAttempt.completedAt))
      .limit(5),
    db
      .select({
        outcome: evaluation.outcome,
        result: evaluation.result,
        submissionId: evaluation.submissionId,
      })
      .from(evaluation)
      .where(eq(evaluation.userId, userId))
      .orderBy(desc(evaluation.createdAt))
      .limit(8),
  ]);

  const [pathItems, missionOutcomes] = await Promise.all([
    path
      ? db
          .select({
            title: learningPathItem.title,
            reason: learningPathItem.reason,
            status: learningPathItem.status,
            skill: skill.slug,
          })
          .from(learningPathItem)
          .leftJoin(skill, eq(learningPathItem.skillId, skill.id))
          .where(eq(learningPathItem.pathId, path.id))
          .orderBy(learningPathItem.order)
      : Promise.resolve([]),
    outcomesByMission(missions.map((m) => m.id)),
  ]);

  const current = missions.find((m) => (ACTIVE_MISSION as readonly string[]).includes(m.status)) ?? null;

  return {
    userId,
    name: account?.name ?? "Learner",
    tracks,
    goals: [...(profile?.goals ?? []), ...(profile?.customGoal ? [profile.customGoal] : [])],
    background: {
      currentRole: profile?.currentRole ?? null,
      yearsExperience: profile?.yearsExperience ?? null,
      technologiesUsed: profile?.technologiesUsed ?? [],
      weeklyLearningHours: profile?.weeklyLearningHours ?? null,
      learningStyle: profile?.learningStyle ?? null,
      previousLearning: profile?.previousLearning ?? null,
      existingProjects: profile?.existingProjects ?? null,
    },
    tone: {
      preference: profile?.mentorTone ?? "balanced",
      momentum: deriveMomentum(evaluations.map((e) => e.outcome)),
    },
    skills,
    weakSkills: skills
      .filter((s) => s.ability < WEAK_ABILITY && s.confidence >= WEAK_MIN_CONFIDENCE)
      .map((s) => s.slug),
    currentPath: path ? { focusSummary: path.focusSummary, items: pathItems } : null,
    currentMission: current
      ? {
          id: current.id,
          title: current.title,
          type: current.type,
          objective: current.objective,
          status: current.status,
        }
      : null,
    recentMissions: missions
      .filter((m) => m.status === "evaluated" || m.status === "skipped")
      .map((m) => ({
        title: m.title,
        outcome: missionOutcomes.get(m.id) ?? null,
        completedAt: m.updatedAt.toISOString(),
      })),
    recentAssessments: attempts.map((a) => ({
      title: a.title,
      kind: a.kind,
      score: a.score === null ? null : Number(a.score),
      completedAt: a.completedAt?.toISOString() ?? null,
    })),
    recentMistakes: evaluations.flatMap((e) => mistakesFrom(e.result)),
  };
}

async function outcomesByMission(missionIds: string[]): Promise<Map<string, Outcome>> {
  if (missionIds.length === 0) return new Map();
  const rows = await db
    .select({ missionId: missionSubmission.missionId, outcome: evaluation.outcome })
    .from(evaluation)
    .innerJoin(missionSubmission, eq(evaluation.submissionId, missionSubmission.id))
    .where(inArray(missionSubmission.missionId, missionIds))
    .orderBy(desc(evaluation.createdAt));

  const outcomes = new Map<string, Outcome>();
  for (const row of rows) if (!outcomes.has(row.missionId)) outcomes.set(row.missionId, row.outcome);
  return outcomes;
}

/** Weaknesses from submission evaluations and misconceptions from graded assessments. */
function mistakesFrom(result: unknown): string[] {
  if (!result || typeof result !== "object") return [];
  const record = result as { weaknesses?: unknown; grades?: unknown };

  const weaknesses = Array.isArray(record.weaknesses)
    ? record.weaknesses.filter((value): value is string => typeof value === "string")
    : [];
  const misconceptions = Array.isArray(record.grades)
    ? record.grades.flatMap((grade) =>
        grade &&
        typeof grade === "object" &&
        typeof (grade as { misconception?: unknown }).misconception === "string"
          ? [(grade as { misconception: string }).misconception]
          : [],
      )
    : [];

  return [...weaknesses, ...misconceptions];
}
