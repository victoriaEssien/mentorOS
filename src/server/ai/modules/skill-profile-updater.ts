import "server-only";

import { NotImplementedError } from "@/lib/errors";

import type { SkillJudgement } from "../schemas";

/**
 * Skill Profile Updater
 *
 * Converts validated evaluation output into skill_evidence rows (PRD §33).
 * Pure mapping, no model call. The ability/confidence maths lives in src/server/learning/skill-estimate.ts.
 */

export type EvidenceSource = {
  userId: string;
  sourceType: "assessment" | "quiz" | "mission" | "project" | "manual" | "reflection";
  sourceId: string;
};

export type NewEvidenceRow = {
  userId: string;
  skillSlug: string;
  sourceType: EvidenceSource["sourceType"];
  sourceId: string;
  score: number;
  confidence: number;
  evidenceSummary: string;
};

export function toEvidenceRows(input: {
  source: EvidenceSource;
  judgements: SkillJudgement[];
}): NewEvidenceRow[] {
  void input;
  throw new NotImplementedError("skill-profile-updater.toEvidenceRows");
}
