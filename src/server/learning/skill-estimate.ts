import { NotImplementedError } from "@/lib/errors";

/**
 * Deterministic ability and confidence estimate per skill (PRD §10, §28).
 * Plain code over skill_evidence rows, so the profile is reproducible and testable without a model.
 *
 * Things the estimate should account for when implemented:
 * - recency (old evidence decays, which is what triggers retention checks)
 * - source weight (a weekly challenge is stronger evidence than a multiple-choice answer)
 * - hints used during the observation
 * - evidence count (few observations means low confidence, even with a high score)
 */
export type EvidenceObservation = {
  score: number;
  confidence: number;
  sourceType: "assessment" | "quiz" | "mission" | "project" | "manual" | "reflection";
  createdAt: Date;
};

export type SkillEstimate = {
  ability: number;
  confidence: number;
  evidenceCount: number;
};

export function estimateSkill(observations: EvidenceObservation[], now: Date = new Date()): SkillEstimate {
  void observations;
  void now;
  throw new NotImplementedError("estimateSkill");
}

/** Display band for the profile UI (Beginner / Developing / Intermediate / Strong). */
export function abilityBand(ability: number): "beginner" | "developing" | "intermediate" | "strong" {
  void ability;
  throw new NotImplementedError("abilityBand");
}
