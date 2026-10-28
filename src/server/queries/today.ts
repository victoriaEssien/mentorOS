import "server-only";
import { and, desc, eq, gte } from "drizzle-orm";
import type { Route } from "next";

import { db } from "@/db";
import { assessment, assessmentAttempt, evaluation, mission, missionSubmission } from "@/db/schema";
import { ASSESSMENT_KIND_LABEL } from "@/lib/assessment-kinds";

import { getAssessmentHistory } from "./assessments";
import { getMissionsOverview } from "./missions";
import { getPathOverview } from "./path";

/**
 * Everything Today shows (PRD §26): where the learner stands, what's in play, what's open, and
 * how their latest work went.
 */
export async function getToday(userId: string) {
  const [path, missions, assessments, recent] = await Promise.all([
    getPathOverview(userId),
    getMissionsOverview(userId),
    getAssessmentHistory(userId),
    getRecentResults(userId, 4),
  ]);
  const open = assessments.filter((row) => row.completedAt === null);

  return {
    path,
    daily: missions.daily,
    dailyOver: missions.dailyOver,
    weekly: missions.weekly,
    openDiagnostic: open.find((row) => row.kind === "diagnostic") ?? null,
    hasDiagnostic: assessments.some((row) => row.kind === "diagnostic"),
    openSurprise: open.find((row) => row.kind === "surprise") ?? null,
    openChecks: open.filter((row) => row.kind === "knowledge_check" || row.kind === "reassessment"),
    recent,
  };
}

export type Today = Awaited<ReturnType<typeof getToday>>;

/**
 * The latest evaluated work, newest first: missions, weekly challenges and assessments alike.
 * Optionally only what was evaluated since a date (the weekly progress email).
 */
export async function getRecentResults(userId: string, limit: number, since?: Date) {
  const rows = await db
    .select({
      id: evaluation.id,
      outcome: evaluation.outcome,
      at: evaluation.createdAt,
      missionId: mission.id,
      missionTitle: mission.title,
      cadence: mission.cadence,
      assessmentId: assessment.id,
      assessmentTitle: assessment.title,
      kind: assessment.kind,
    })
    .from(evaluation)
    .leftJoin(missionSubmission, eq(missionSubmission.id, evaluation.submissionId))
    .leftJoin(mission, eq(mission.id, missionSubmission.missionId))
    .leftJoin(assessmentAttempt, eq(assessmentAttempt.id, evaluation.attemptId))
    .leftJoin(assessment, eq(assessment.id, assessmentAttempt.assessmentId))
    .where(and(eq(evaluation.userId, userId), since ? gte(evaluation.createdAt, since) : undefined))
    .orderBy(desc(evaluation.createdAt))
    .limit(limit);

  return rows.flatMap((row) => {
    const shared = { id: row.id, outcome: row.outcome, at: row.at };
    if (row.missionId) {
      return [
        {
          ...shared,
          title: row.missionTitle ?? "Mission",
          label: row.cadence === "weekly" ? "Weekly challenge" : "Mission",
          href: `/missions/${row.missionId}/evaluation` as Route,
        },
      ];
    }
    if (row.assessmentId && row.kind) {
      return [
        {
          ...shared,
          title: row.assessmentTitle ?? ASSESSMENT_KIND_LABEL[row.kind],
          label: ASSESSMENT_KIND_LABEL[row.kind],
          href: `/assessments/${row.assessmentId}/results` as Route,
        },
      ];
    }
    return [];
  });
}
