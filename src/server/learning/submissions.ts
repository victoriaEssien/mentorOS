import "server-only";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { evaluation, mission, missionSkill, missionSubmission, skill } from "@/db/schema";
import type { Reflection } from "@/db/schema/learning";
import { parseGithubLink } from "@/lib/github-links";
import { toEvidenceRows } from "@/server/ai/modules/skill-profile-updater";
import { evaluateSubmission, PROMPT_VERSION } from "@/server/ai/modules/submission-evaluator";
import type { SubmissionEvaluation } from "@/server/ai/schemas";

import { readArtifacts } from "./artifacts";
import type { SkillChange } from "./evidence";
import { demonstratedAbility, GRADING_VERSION, verdictFor, type Verdict } from "./grading";
import { MissionNotFoundError } from "./missions";
import { completePathStep } from "./path";
import { prepareEvidence } from "./profile";

/** Already handed in, evaluated or skipped. */
export class MissionClosedError extends Error {
  constructor() {
    super("Mission is not open for submissions");
    this.name = "MissionClosedError";
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
      ),
    )
    .returning();
  if (!claimed) {
    const [exists] = await db
      .select({ id: mission.id })
      .from(mission)
      .where(and(eq(mission.id, missionId), eq(mission.userId, userId)))
      .limit(1);
    throw exists ? new MissionClosedError() : new MissionNotFoundError();
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

    const { evaluation: graded, meta } = await evaluateSubmission({
      mission: {
        title: claimed.title,
        type: claimed.type,
        difficulty: claimed.difficulty,
        objective: claimed.objective,
        deliverable: claimed.deliverable,
        instructions: claimed.instructions,
        criteria: claimed.evaluationCriteria,
        skills: skills.map((s) => ({ slug: s.slug, name: s.name })),
      },
      work: {
        content: input.content,
        links,
        reflection: Object.entries(input.reflection ?? {}).flatMap(([key, answer]) =>
          answer ? [{ question: REFLECTION_QUESTIONS[key as keyof Reflection], answer }] : [],
        ),
      },
    });

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
