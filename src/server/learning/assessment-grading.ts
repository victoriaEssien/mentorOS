import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { isUniqueViolation } from "@/db/errors";
import {
  assessment,
  assessmentAttempt,
  assessmentItem,
  assessmentResponse,
  evaluation,
  skill,
} from "@/db/schema";
import type { AssessmentResponse, ItemPrompt } from "@/lib/assessment-response";
import { gradeAnswer, PROMPT_VERSION } from "@/server/ai/modules/skill-evaluator";
import { toEvidenceRows } from "@/server/ai/modules/skill-profile-updater";
import { modelId } from "@/server/ai/provider";
import type { GeneratedAssessmentItem } from "@/server/ai/schemas";

import { AssessmentClosedError, AssessmentNotFoundError } from "./attempts";
import type { SkillChange } from "./evidence";
import {
  GRADING_VERSION,
  gradeByRules,
  gradeFromModel,
  overallScore,
  verdictFor,
  type GradingItem,
  type ItemGrade,
  type Verdict,
} from "./grading";
import { prepareEvidence } from "./profile";

type Rubric = GeneratedAssessmentItem["rubric"];

/** What an evaluation row's `result` holds for an assessment attempt. */
export type AttemptEvaluationResult = {
  gradingVersion: string;
  score: number;
  items: ItemGrade[];
  changes: SkillChange[];
};

/**
 * Grades a handed-in attempt and records what it showed (PRD §9, §10). Choice items and "I don't
 * know" are marked in code; written answers go to the Skill Evaluator in parallel. Nothing is
 * written until every answer is graded, then the attempt's completion, its evaluation, the
 * response scores and the skill evidence commit in one transaction. If any grade fails, nothing
 * changes and the learner can hand in again.
 */
export async function gradeAttempt(
  userId: string,
  attemptId: string,
  now: Date = new Date(),
): Promise<{
  evaluationId: string;
  outcome: Verdict;
  changes: SkillChange[];
  kind: (typeof assessment.$inferSelect)["kind"];
}> {
  const started = performance.now();

  const [attempt] = await db
    .select({
      assessmentId: assessmentAttempt.assessmentId,
      completedAt: assessmentAttempt.completedAt,
      kind: assessment.kind,
    })
    .from(assessmentAttempt)
    .innerJoin(assessment, eq(assessment.id, assessmentAttempt.assessmentId))
    .where(and(eq(assessmentAttempt.id, attemptId), eq(assessmentAttempt.userId, userId)))
    .limit(1);
  if (!attempt) throw new AssessmentNotFoundError();
  if (attempt.completedAt) throw new AssessmentClosedError();

  const [itemRows, responseRows] = await Promise.all([
    db
      .select({
        id: assessmentItem.id,
        type: assessmentItem.type,
        prompt: assessmentItem.prompt,
        rubric: assessmentItem.rubric,
        skillIds: assessmentItem.skillIds,
        difficulty: assessmentItem.difficulty,
      })
      .from(assessmentItem)
      .where(eq(assessmentItem.assessmentId, attempt.assessmentId))
      .orderBy(assessmentItem.order),
    db
      .select({
        itemId: assessmentResponse.itemId,
        response: assessmentResponse.response,
        hintsUsed: assessmentResponse.hintsUsed,
      })
      .from(assessmentResponse)
      .where(eq(assessmentResponse.attemptId, attemptId)),
  ]);

  const skillIds = [...new Set(itemRows.flatMap((item) => item.skillIds))];
  const skills =
    skillIds.length > 0
      ? await db
          .select({ id: skill.id, slug: skill.slug, name: skill.name, description: skill.description })
          .from(skill)
          .where(inArray(skill.id, skillIds))
      : [];
  const skillById = new Map(skills.map((s) => [s.id, s]));
  const responses = new Map(responseRows.map((row) => [row.itemId, row]));

  // One failed grade fails the hand-in, so stop paying for the others.
  const controller = new AbortController();
  const grades = await Promise.all(
    itemRows.map(async (row): Promise<ItemGrade> => {
      const prompt = row.prompt as ItemPrompt;
      const rubric = row.rubric as Rubric;
      const itemSkills = row.skillIds.flatMap((id) => skillById.get(id) ?? []);
      const item: GradingItem = {
        id: row.id,
        difficulty: row.difficulty,
        question: prompt.question,
        options: prompt.options,
        correctOption: rubric.correctOption,
        skillSlugs: itemSkills.map((s) => s.slug),
      };

      const response = responses.get(row.id)?.response as AssessmentResponse | undefined;
      const byRules = gradeByRules(item, response);
      if (byRules) return byRules;

      try {
        const { grade } = await gradeAnswer({
          item: {
            type: row.type,
            difficulty: row.difficulty,
            question: prompt.question,
            code: prompt.code,
            expected: rubric.expected,
            gradingNotes: rubric.gradingNotes,
          },
          skills: itemSkills,
          answer: response?.kind === "text" ? response.text.trim() : "",
          abortSignal: controller.signal,
        });
        return gradeFromModel(item, grade);
      } catch (error) {
        controller.abort();
        throw error;
      }
    }),
  );

  const evidence = grades.flatMap(
    (grade) =>
      toEvidenceRows({
        source: { userId, sourceType: "assessment", sourceId: attemptId },
        judgements: grade.judgements,
        skillIdBySlug: new Map(skills.map((s) => [s.slug, s.id])),
        hintsUsed: responses.get(grade.itemId)?.hintsUsed ?? 0,
      }).rows,
  );
  const { changes, statements } = await prepareEvidence(userId, evidence, now);

  const score = overallScore(grades);
  const outcome = verdictFor(score);
  const result: AttemptEvaluationResult = { gradingVersion: GRADING_VERSION, score, items: grades, changes };
  const usedModel = grades.some((grade) => grade.gradedBy === "model");
  const scoreByItem = new Map(grades.map((grade) => [grade.itemId, grade.score]));
  const evaluationId = crypto.randomUUID();

  try {
    await db.batch([
      db.update(assessmentAttempt).set({ completedAt: now }).where(eq(assessmentAttempt.id, attemptId)),
      // Unique per attempt: if another hand-in of this attempt got here first, this insert fails
      // and the whole transaction rolls back.
      db.insert(evaluation).values({
        id: evaluationId,
        userId,
        attemptId,
        outcome,
        result,
        model: usedModel ? modelId("smart") : "rules",
        promptVersion: `${PROMPT_VERSION}/${GRADING_VERSION}`,
      }),
      ...(responseRows.length > 0
        ? [
            db
              .insert(assessmentResponse)
              .values(
                responseRows.map((row) => ({
                  attemptId,
                  itemId: row.itemId,
                  response: row.response,
                  score: scoreByItem.get(row.itemId) ?? 0,
                })),
              )
              .onConflictDoUpdate({
                target: [assessmentResponse.attemptId, assessmentResponse.itemId],
                set: { score: sql`excluded.score` },
              }),
          ]
        : []),
      ...statements,
    ]);
  } catch (error) {
    if (isUniqueViolation(error)) throw new AssessmentClosedError();
    throw error;
  }

  console.info(
    JSON.stringify({
      event: "assessment.graded",
      attemptId,
      items: grades.length,
      byModel: grades.filter((grade) => grade.gradedBy === "model").length,
      evidence: evidence.length,
      outcome,
      durationMs: Math.round(performance.now() - started),
    }),
  );

  return { evaluationId, outcome, changes, kind: attempt.kind };
}
