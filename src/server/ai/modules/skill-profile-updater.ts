import "server-only";

import type { SkillJudgement } from "../schemas";

/**
 * Skill Profile Updater
 *
 * Converts validated evaluation output into skill_evidence rows (PRD §33).
 * Pure mapping, no model call. The ability/confidence maths lives in src/server/learning/skill-estimate.ts.
 *
 * - Skills the model names that aren't in the taxonomy are dropped and reported, never created.
 * - Scores and confidences are clamped to 0..1.
 * - Hints change how much an observation counts, not what it scored: each hint the mentor gave
 *   shrinks the observation's confidence.
 */

export type EvidenceSource = {
  userId: string;
  sourceType: "assessment" | "quiz" | "mission" | "project" | "manual" | "reflection";
  sourceId: string;
};

export type NewEvidenceRow = {
  userId: string;
  skillId: string;
  sourceType: EvidenceSource["sourceType"];
  sourceId: string;
  score: number;
  confidence: number;
  evidenceSummary: string;
};

/** Confidence multiplier per hint: one hint → 0.67, two → 0.5, three → 0.4. */
export const hintDiscount = (hintsUsed: number) => 1 / (1 + 0.5 * Math.max(0, hintsUsed));

const MAX_SUMMARY_LENGTH = 500;

const clamp01 = (value: number) => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0);

export function toEvidenceRows({
  source,
  judgements,
  skillIdBySlug,
  hintsUsed = 0,
}: {
  source: EvidenceSource;
  judgements: readonly SkillJudgement[];
  skillIdBySlug: ReadonlyMap<string, string>;
  hintsUsed?: number;
}): { rows: NewEvidenceRow[]; unknownSkills: string[] } {
  const rows: NewEvidenceRow[] = [];
  const unknownSkills: string[] = [];

  for (const judgement of judgements) {
    const slug = judgement.skill.trim().toLowerCase();
    const skillId = skillIdBySlug.get(slug);
    if (!skillId) {
      unknownSkills.push(judgement.skill);
      continue;
    }

    rows.push({
      userId: source.userId,
      skillId,
      sourceType: source.sourceType,
      sourceId: source.sourceId,
      score: clamp01(judgement.score),
      confidence: clamp01(judgement.confidence) * hintDiscount(hintsUsed),
      evidenceSummary: judgement.evidence.trim().slice(0, MAX_SUMMARY_LENGTH),
    });
  }

  return { rows, unknownSkills };
}
