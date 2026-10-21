import "server-only";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { assessment, assessmentAttempt, assessmentItem, assessmentResponse, evaluation } from "@/db/schema";
import type { AssessmentResponse, ItemPrompt } from "@/lib/assessment-response";
import type { GeneratedAssessmentItem } from "@/server/ai/schemas";
import type { AttemptEvaluationResult } from "@/server/learning/assessment-grading";

import { getTaxonomy } from "./skills";

/**
 * Everything the assessment player needs, for an assessment the learner owns. Items are selected
 * without their rubrics: grading keys never reach the browser before the hand-in.
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
    // A row without a response only holds hints asked for on an unanswered question.
    responses: Object.fromEntries(
      responses.flatMap((r) => (r.response ? [[r.itemId, r.response as AssessmentResponse]] : [])),
    ),
  };
}

export type PlayerData = NonNullable<Awaited<ReturnType<typeof getAssessmentForPlayer>>>;

/**
 * A handed-in assessment: every answer with how it was graded, and what it did to the skill
 * profile. Null when the assessment isn't the learner's; `review` is null until it's handed in.
 * The rubric's expected answer and key are part of the review, so they are safe to send now.
 */
export async function getAssessmentResults(userId: string, assessmentId: string) {
  if (!z.uuid().safeParse(assessmentId).success) return null;

  const [row] = await db
    .select({
      id: assessment.id,
      kind: assessment.kind,
      title: assessment.title,
      attemptId: assessmentAttempt.id,
      completedAt: assessmentAttempt.completedAt,
    })
    .from(assessment)
    .leftJoin(
      assessmentAttempt,
      and(
        eq(assessmentAttempt.assessmentId, assessment.id),
        eq(assessmentAttempt.userId, userId),
        isNotNull(assessmentAttempt.completedAt),
      ),
    )
    .where(and(eq(assessment.id, assessmentId), eq(assessment.userId, userId)))
    .orderBy(desc(assessmentAttempt.completedAt))
    .limit(1);
  if (!row) return null;

  const header = { id: row.id, kind: row.kind, title: row.title };
  if (!row.attemptId || !row.completedAt) return { assessment: header, review: null };

  const [items, responses, [graded], { skills }] = await Promise.all([
    db
      .select({
        id: assessmentItem.id,
        type: assessmentItem.type,
        prompt: assessmentItem.prompt,
        rubric: assessmentItem.rubric,
        difficulty: assessmentItem.difficulty,
      })
      .from(assessmentItem)
      .where(eq(assessmentItem.assessmentId, assessmentId))
      .orderBy(assessmentItem.order),
    db
      .select({ itemId: assessmentResponse.itemId, response: assessmentResponse.response })
      .from(assessmentResponse)
      .where(eq(assessmentResponse.attemptId, row.attemptId)),
    db
      .select({ outcome: evaluation.outcome, result: evaluation.result })
      .from(evaluation)
      .where(eq(evaluation.attemptId, row.attemptId))
      .limit(1),
    getTaxonomy(),
  ]);
  // Grading writes the evaluation and completes the attempt in one transaction.
  if (!graded) throw new Error(`Attempt ${row.attemptId} is complete but has no evaluation`);

  const result = graded.result as AttemptEvaluationResult;
  const gradeByItem = new Map(result.items.map((grade) => [grade.itemId, grade]));
  const responseByItem = new Map(
    responses.map((r) => [r.itemId, (r.response ?? null) as AssessmentResponse | null]),
  );
  const skillById = new Map(skills.map((s) => [s.id, s]));

  const answers = items.flatMap((item, index) => {
    const grade = gradeByItem.get(item.id);
    if (!grade) return [];
    const prompt = item.prompt as ItemPrompt;
    const rubric = item.rubric as GeneratedAssessmentItem["rubric"];
    return [
      {
        itemId: item.id,
        number: index + 1,
        type: item.type,
        prompt,
        expected: rubric.expected,
        correctOption: rubric.correctOption,
        response: responseByItem.get(item.id) ?? null,
        grade,
      },
    ];
  });

  const measured = result.changes
    .flatMap((change) => {
      const skill = skillById.get(change.skillId);
      return skill ? [{ id: skill.id, slug: skill.slug, name: skill.name, ...change.after }] : [];
    })
    .sort((a, b) => b.ability - a.ability);

  return {
    assessment: header,
    review: {
      completedAt: row.completedAt,
      outcome: graded.outcome,
      score: result.score,
      answers,
      skills: measured,
    },
  };
}

export type AssessmentReview = NonNullable<
  NonNullable<Awaited<ReturnType<typeof getAssessmentResults>>>["review"]
>;

/** Every assessment the learner has, newest first, with whether it's done and how it went. */
export async function getAssessmentHistory(userId: string) {
  const rows = await db
    .select({
      id: assessment.id,
      kind: assessment.kind,
      title: assessment.title,
      createdAt: assessment.createdAt,
      completedAt: assessmentAttempt.completedAt,
      outcome: evaluation.outcome,
      result: evaluation.result,
    })
    .from(assessment)
    .leftJoin(
      assessmentAttempt,
      and(eq(assessmentAttempt.assessmentId, assessment.id), isNotNull(assessmentAttempt.completedAt)),
    )
    .leftJoin(evaluation, eq(evaluation.attemptId, assessmentAttempt.id))
    .where(eq(assessment.userId, userId))
    .orderBy(desc(assessment.createdAt))
    .limit(50);

  return rows.map(({ result, ...row }) => ({
    ...row,
    score: result ? (result as AttemptEvaluationResult).score : null,
  }));
}
