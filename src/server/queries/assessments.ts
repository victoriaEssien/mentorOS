import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { assessment, assessmentAttempt, assessmentItem, assessmentResponse } from "@/db/schema";
import type { AssessmentResponse, ItemPrompt } from "@/lib/assessment-response";

/**
 * Everything the assessment player needs, for an assessment the learner owns. Items are selected
 * without their rubrics: grading keys never reach the browser (AGENTS: never reveal rubrics).
 */
export async function getAssessmentForPlayer(userId: string, assessmentId: string) {
  if (!z.uuid().safeParse(assessmentId).success) return null;

  const [row] = await db
    .select({ id: assessment.id, kind: assessment.kind, title: assessment.title, reason: assessment.reason })
    .from(assessment)
    .where(and(eq(assessment.id, assessmentId), eq(assessment.userId, userId)))
    .limit(1);
  if (!row) return null;

  const [items, attempts] = await Promise.all([
    db
      .select({
        id: assessmentItem.id,
        type: assessmentItem.type,
        prompt: assessmentItem.prompt,
        difficulty: assessmentItem.difficulty,
        timeLimitSeconds: assessmentItem.timeLimitSeconds,
      })
      .from(assessmentItem)
      .where(eq(assessmentItem.assessmentId, assessmentId))
      .orderBy(assessmentItem.order),
    db
      .select()
      .from(assessmentAttempt)
      .where(and(eq(assessmentAttempt.assessmentId, assessmentId), eq(assessmentAttempt.userId, userId)))
      .orderBy(desc(assessmentAttempt.startedAt)),
  ]);

  const openAttempt = attempts.find((attempt) => attempt.completedAt === null) ?? null;
  const completedAttempt = attempts.find((attempt) => attempt.completedAt !== null) ?? null;

  const responses = openAttempt
    ? await db
        .select({ itemId: assessmentResponse.itemId, response: assessmentResponse.response })
        .from(assessmentResponse)
        .where(eq(assessmentResponse.attemptId, openAttempt.id))
    : [];

  return {
    assessment: row,
    items: items.map((item) => ({ ...item, prompt: item.prompt as ItemPrompt })),
    openAttempt,
    completedAttempt,
    responses: Object.fromEntries(responses.map((r) => [r.itemId, r.response as AssessmentResponse])),
  };
}

export type PlayerData = NonNullable<Awaited<ReturnType<typeof getAssessmentForPlayer>>>;
