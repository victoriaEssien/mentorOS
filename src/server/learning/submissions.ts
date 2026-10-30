import "server-only";
import { and, eq, gt, inArray, isNull, or } from "drizzle-orm";

import { db } from "@/db";
import { evaluation, mission, missionSubmission } from "@/db/schema";
import type { Reflection } from "@/db/schema/learning";
import { parseGithubLink } from "@/lib/github-links";
import {
  applyCorrections,
  checkEvaluation,
  type AppliedCorrection,
} from "@/server/ai/modules/evaluation-checker";
import {
  evaluateSubmission,
  PROMPT_VERSION,
  type EvaluatedMission,
  type EvaluatedWork,
} from "@/server/ai/modules/submission-evaluator";
import type { SubmissionEvaluation } from "@/server/ai/schemas";

import { readArtifacts } from "./artifacts";
import { expireOverdueMissions, MissionNotFoundError } from "./missions";

/** Bump when the scoring below changes, so stored evaluations stay traceable. */
export const GRADING_VERSION = "g4";

export type Verdict = "strong" | "pass" | "partial" | "fail";

/** How good the work was, from its share of the points: 0.7 and up means the core is right. */
export function verdictFor(score: number): Verdict {
  if (score >= 0.85) return "strong";
  if (score >= 0.7) return "pass";
  if (score >= 0.3) return "partial";
  return "fail";
}

/** Already handed in, evaluated or skipped. */
export class MissionClosedError extends Error {
  constructor() {
    super("Mission is not open for submissions");
    this.name = "MissionClosedError";
  }
}

/** It ran out of time before it was handed in: recorded as missed, not scored. */
export class MissionExpiredError extends Error {
  constructor() {
    super("Mission expired before it was handed in");
    this.name = "MissionExpiredError";
  }
}

export const REFLECTION_QUESTIONS: Record<keyof Reflection, string> = {
  learned: "What did you learn?",
  gotWrong: "What did you get wrong, or nearly?",
  difficult: "What was difficult?",
  understoodBetter: "What did you understand better?",
  wouldChange: "What would you do differently?",
  stillConfused: "What are you still unsure about?",
};

export type WorkInput = { content: string; links: string[]; reflection: Reflection | null };

/** What an evaluation row's `result` holds for a mission submission. */
export type SubmissionEvaluationResult = SubmissionEvaluation & {
  gradingVersion: string;
  /** Points scored over points available, 0 to 1. */
  score: number;
  /** What was read from each link, or why it couldn't be. */
  links: { url: string; files: string[]; note: string | null }[];
  /**
   * What the second look fixed before the learner saw it (empty when everything held). Null when
   * the check failed and the first look stood; absent on evaluations from before it existed.
   */
  secondLook?: { model: string; promptVersion: string; corrections: AppliedCorrection[] } | null;
};

/**
 * Hands in a project and reviews it against the brief. The project is claimed first, so a double
 * submit can't evaluate twice. The evaluation and the project's new state then commit together.
 * If reviewing fails, the project goes back to "in progress" so the learner can hand in again;
 * the submission itself stays on record.
 */
export async function submitWork(
  userId: string,
  missionId: string,
  input: WorkInput,
  now: Date = new Date(),
): Promise<{ submissionId: string; evaluationId: string; outcome: Verdict }> {
  const [claimed] = await db
    .update(mission)
    .set({ status: "submitted" })
    .where(
      and(
        eq(mission.id, missionId),
        eq(mission.userId, userId),
        inArray(mission.status, ["assigned", "in_progress"]),
        or(isNull(mission.dueAt), gt(mission.dueAt, now)),
      ),
    )
    .returning();
  if (!claimed) {
    await expireOverdueMissions(userId, now);
    const [exists] = await db
      .select({ status: mission.status })
      .from(mission)
      .where(and(eq(mission.id, missionId), eq(mission.userId, userId)))
      .limit(1);
    if (!exists) throw new MissionNotFoundError();
    throw exists.status === "expired" ? new MissionExpiredError() : new MissionClosedError();
  }

  const submissionId = crypto.randomUUID();
  try {
    await db.insert(missionSubmission).values({
      id: submissionId,
      missionId,
      userId,
      content: input.content,
      artifacts: input.links.map((url) => ({
        kind: parseGithubLink(url)?.kind === "repo" ? "repo" : "link",
        url,
      })),
      reflection: input.reflection,
      submittedAt: now,
    });

    const links = await readArtifacts(input.links);

    const evaluatedMission: EvaluatedMission = {
      title: claimed.title,
      type: claimed.type,
      difficulty: claimed.difficulty,
      objective: claimed.objective,
      deliverable: claimed.deliverable,
      instructions: claimed.instructions,
      acceptanceCriteria: claimed.acceptanceCriteria,
      criteria: claimed.evaluationCriteria,
      skills: [],
    };
    const work: EvaluatedWork = {
      content: input.content,
      links,
      reflection: Object.entries(input.reflection ?? {}).flatMap(([key, answer]) =>
        answer ? [{ question: REFLECTION_QUESTIONS[key as keyof Reflection], answer }] : [],
      ),
    };
    const { evaluation: firstLook, meta } = await evaluateSubmission({ mission: evaluatedMission, work });
    const { evaluation: graded, secondLook } = await withSecondLook(firstLook, evaluatedMission, work);

    const available = claimed.evaluationCriteria.reduce((sum, c) => sum + c.maxScore, 0);
    const score = available > 0 ? graded.criteria.reduce((sum, c) => sum + c.score, 0) / available : 0;
    const outcome = verdictFor(score);

    const result: SubmissionEvaluationResult = {
      ...graded,
      gradingVersion: GRADING_VERSION,
      score: Math.round(score * 1000) / 1000,
      links: links.map((link) => ({ url: link.url, files: link.files.map((f) => f.path), note: link.note })),
      secondLook,
    };

    const evaluationId = crypto.randomUUID();
    await db.batch([
      db.insert(evaluation).values({
        id: evaluationId,
        userId,
        submissionId,
        outcome,
        result,
        model: meta.model,
        promptVersion: `${PROMPT_VERSION}/${GRADING_VERSION}`,
        createdAt: now,
      }),
      db.update(mission).set({ status: "evaluated" }).where(eq(mission.id, missionId)),
    ]);

    console.info(
      JSON.stringify({
        event: "mission.evaluated",
        missionId,
        outcome,
        score: result.score,
        linksRead: links.filter((l) => l.files.length > 0).length,
      }),
    );
    return { submissionId, evaluationId, outcome };
  } catch (error) {
    await db
      .update(mission)
      .set({ status: "in_progress" })
      .where(and(eq(mission.id, missionId), eq(mission.status, "submitted")));
    throw error;
  }
}

/**
 * The second look (Evaluation Checker): wrong claims in the feedback are fixed before the learner
 * sees it, and a criterion is re-scored when a wrong claim changed its marks, so the score and the
 * verdict computed after this match the corrected feedback. If the check fails, the first look
 * stands: a hand-in is never lost to it.
 */
async function withSecondLook(
  firstLook: SubmissionEvaluation,
  mission: EvaluatedMission,
  work: EvaluatedWork,
): Promise<{ evaluation: SubmissionEvaluation; secondLook: SubmissionEvaluationResult["secondLook"] }> {
  try {
    const { corrections, meta } = await checkEvaluation({ mission, work, evaluation: firstLook });
    const { evaluation, applied } = applyCorrections(firstLook, corrections, mission);
    if (applied.length > 0) {
      console.info(
        JSON.stringify({
          event: "evaluation.corrected",
          corrections: applied.length,
          rescored: applied.filter((c) => c.scoreBefore !== c.scoreAfter).length,
        }),
      );
    }
    return {
      evaluation,
      secondLook: { model: meta.model, promptVersion: meta.promptVersion, corrections: applied },
    };
  } catch (error) {
    console.error(JSON.stringify({ event: "evaluation.check_failed", reason: String(error) }));
    return { evaluation: firstLook, secondLook: null };
  }
}
