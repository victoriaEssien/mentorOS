import "server-only";
import { and, eq, gt, inArray, isNull, or } from "drizzle-orm";

import { db } from "@/db";
import { evaluation, mission, missionSkill, missionSubmission, skill } from "@/db/schema";
import type { Reflection } from "@/db/schema/learning";
import { parseGithubLink } from "@/lib/github-links";
import { toEvidenceRows } from "@/server/ai/modules/skill-profile-updater";
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
import type { SkillChange } from "./evidence";
import { demonstratedAbility, GRADING_VERSION, verdictFor, type Verdict } from "./grading";
import { expireOverdueMissions, MissionNotFoundError } from "./missions";
import { completePathStep } from "./path";
import { prepareEvidence } from "./profile";

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
  changes: SkillChange[];
  /** What was read from each link, or why it couldn't be. */
  links: { url: string; files: string[]; note: string | null }[];
  /**
   * What the second look fixed before the learner saw it (empty when everything held). Null when
   * the check failed and the first look stood; absent on evaluations from before it existed.
   */
  secondLook?: { model: string; promptVersion: string; corrections: AppliedCorrection[] } | null;
};

/**
 * Hands in work for a mission and evaluates it (PRD §15, §16, §20). The mission is claimed first,
 * so a double submit can't evaluate twice. The evaluation, its evidence, the mission's new state
 * and any path progress then commit together. If evaluating fails, the mission goes back to "in
 * progress" so the learner can hand in again; the submission itself stays on record.
 */
export async function submitWork(
  userId: string,
  missionId: string,
  input: WorkInput,
  now: Date = new Date(),
): Promise<{ submissionId: string; evaluationId: string; outcome: Verdict; pathFinished: boolean }> {
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

    const [skills, links] = await Promise.all([
      db
        .select({ id: skill.id, slug: skill.slug, name: skill.name })
        .from(missionSkill)
        .innerJoin(skill, eq(skill.id, missionSkill.skillId))
        .where(eq(missionSkill.missionId, missionId)),
      readArtifacts(input.links),
    ]);

    const evaluatedMission: EvaluatedMission = {
      title: claimed.title,
      type: claimed.type,
      difficulty: claimed.difficulty,
      objective: claimed.objective,
      deliverable: claimed.deliverable,
      instructions: claimed.instructions,
      criteria: claimed.evaluationCriteria,
      skills: skills.map((s) => ({ slug: s.slug, name: s.name })),
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

    // A weekly challenge is a project: stronger evidence than a daily mission (PRD §19).
    const evidence = toEvidenceRows({
      source: {
        userId,
        sourceType: claimed.cadence === "weekly" ? "project" : "mission",
        sourceId: submissionId,
      },
      judgements: graded.skills.map((judgement) => ({
        ...judgement,
        score: demonstratedAbility(claimed.difficulty ?? 3, judgement.score),
        confidence: Math.min(0.95, Math.max(0.2, judgement.confidence)),
      })),
      skillIdBySlug: new Map(skills.map((s) => [s.slug, s.id])),
    }).rows;

    const [{ changes, statements }, progress] = await Promise.all([
      prepareEvidence(userId, evidence, now),
      outcome === "strong" || outcome === "pass"
        ? completePathStep(claimed.pathItemId)
        : Promise.resolve({ statements: [], finished: false }),
    ]);

    const result: SubmissionEvaluationResult = {
      ...graded,
      gradingVersion: GRADING_VERSION,
      score: Math.round(score * 1000) / 1000,
      changes,
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
      ...statements,
      ...progress.statements,
    ]);

    console.info(
      JSON.stringify({
        event: "mission.evaluated",
        missionId,
        outcome,
        score: result.score,
        linksRead: links.filter((l) => l.files.length > 0).length,
        pathFinished: progress.finished,
      }),
    );
    return { submissionId, evaluationId, outcome, pathFinished: progress.finished };
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
