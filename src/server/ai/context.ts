import "server-only";
import { and, desc, eq, gt, inArray, isNotNull } from "drizzle-orm";

import { db } from "@/db";
import {
  conceptAttempt,
  evaluation,
  learnerProfile,
  mission,
  missionSubmission,
  themeRun,
  user,
} from "@/db/schema";
import { findConcept, themeBySlug } from "@/lib/themes";
import type { Outcome } from "@/server/learning/difficulty";

import { deriveMomentum, missionPoints, type LearnerContext } from "./context-render";

export * from "./context-render";

const IN_PLAY = ["assigned", "in_progress", "submitted"] as const;

/** Builds the learner's context from the database. Called fresh for every AI call. */
export async function buildLearnerContext(userId: string): Promise<LearnerContext> {
  const today = new Date().toISOString().slice(0, 10);
  const [[account], [profile], projects, concepts, evaluations, [run]] = await Promise.all([
    db.select({ name: user.name }).from(user).where(eq(user.id, userId)).limit(1),
    db.select().from(learnerProfile).where(eq(learnerProfile.userId, userId)).limit(1),
    db
      .select({
        id: mission.id,
        title: mission.title,
        stack: mission.stack,
        objective: mission.objective,
        status: mission.status,
        dueAt: mission.dueAt,
        updatedAt: mission.updatedAt,
        criteria: mission.evaluationCriteria,
      })
      .from(mission)
      .where(eq(mission.userId, userId))
      .orderBy(desc(mission.createdAt))
      .limit(8),
    db
      .select({
        day: conceptAttempt.day,
        slug: conceptAttempt.conceptSlug,
        verdict: conceptAttempt.verdict,
        grading: conceptAttempt.grading,
      })
      .from(conceptAttempt)
      .where(and(eq(conceptAttempt.userId, userId), isNotNull(conceptAttempt.explainedAt)))
      .orderBy(desc(conceptAttempt.explainedAt))
      .limit(10),
    db
      .select({ outcome: evaluation.outcome, result: evaluation.result })
      .from(evaluation)
      .where(eq(evaluation.userId, userId))
      .orderBy(desc(evaluation.createdAt))
      .limit(8),
    db
      .select({ themeSlug: themeRun.themeSlug, startsOn: themeRun.startsOn })
      .from(themeRun)
      .where(and(eq(themeRun.userId, userId), gt(themeRun.endsOn, today)))
      .orderBy(desc(themeRun.startsOn))
      .limit(1),
  ]);
  const theme = run ? themeBySlug(run.themeSlug) : null;

  const projectEvaluations = await latestProjectEvaluations(projects.map((p) => p.id));
  const current = projects.find((p) => (IN_PLAY as readonly string[]).includes(p.status)) ?? null;

  return {
    userId,
    name: account?.name ?? "Learner",
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
    currentTheme:
      run && theme
        ? {
            title: theme.title,
            week: Math.floor((Date.parse(today) - Date.parse(run.startsOn)) / (7 * 86_400_000)) + 1,
            weeks: theme.weeks,
          }
        : null,
    currentProject: current
      ? {
          id: current.id,
          title: current.title,
          stack: current.stack,
          objective: current.objective,
          status: current.status,
          dueAt: current.dueAt?.toISOString() ?? null,
        }
      : null,
    recentProjects: projects
      .filter((p) => p.status === "evaluated" || p.status === "skipped" || p.status === "expired")
      .map((p) => {
        const latest = projectEvaluations.get(p.id);
        return {
          title: p.title,
          outcome: latest?.outcome ?? null,
          ended: p.status === "skipped" || p.status === "expired" ? p.status : null,
          completedAt: p.updatedAt.toISOString(),
          points: latest ? missionPoints(latest.result, p.criteria) : null,
        };
      }),
    recentConcepts: concepts.flatMap((c) => {
      const entry = findConcept(c.slug);
      return entry ? [{ title: entry.concept.title, day: c.day, verdict: c.verdict }] : [];
    }),
    recentMistakes: [
      ...evaluations.flatMap((e) => weaknessesFrom(e.result)),
      ...concepts.flatMap((c) => {
        const title = findConcept(c.slug)?.concept.title ?? c.slug;
        return (c.grading?.points ?? [])
          .filter((point) => point.status === "wrong")
          .map((point) => `${title}: ${point.note}`);
      }),
    ],
  };
}

/** Each project's latest evaluation: its outcome and the stored result its points come from. */
async function latestProjectEvaluations(
  missionIds: string[],
): Promise<Map<string, { outcome: Outcome; result: unknown }>> {
  if (missionIds.length === 0) return new Map();
  const rows = await db
    .select({
      missionId: missionSubmission.missionId,
      outcome: evaluation.outcome,
      result: evaluation.result,
    })
    .from(evaluation)
    .innerJoin(missionSubmission, eq(evaluation.submissionId, missionSubmission.id))
    .where(inArray(missionSubmission.missionId, missionIds))
    .orderBy(desc(evaluation.createdAt));

  const latest = new Map<string, { outcome: Outcome; result: unknown }>();
  for (const row of rows) {
    if (!latest.has(row.missionId)) latest.set(row.missionId, { outcome: row.outcome, result: row.result });
  }
  return latest;
}

/** Weaknesses a project review named. */
function weaknessesFrom(result: unknown): string[] {
  const weaknesses = (result as { weaknesses?: unknown } | null)?.weaknesses;
  return Array.isArray(weaknesses)
    ? weaknesses.filter((value): value is string => typeof value === "string")
    : [];
}
