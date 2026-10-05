/**
 * Deterministic ability and confidence estimate per skill (PRD §10, §28).
 * Plain code over skill_evidence rows, so the profile is reproducible and testable without a model.
 *
 * Each observation counts with a weight:
 *
 *   weight = observation confidence × source weight × recency
 *
 * - observation confidence: how much the grader trusts this one observation (hints already
 *   discounted when the evidence row was written, see skill-profile-updater)
 * - source weight: a weekly project is stronger evidence than a multiple-choice answer
 * - recency: halves every RECENCY_HALF_LIFE_DAYS, so old evidence fades and confidence decays,
 *   which is what makes retention checks due
 *
 * Ability is the weighted mean score, shrunk toward the middle when there is little evidence.
 * Confidence grows with total weight and drops when observations disagree with each other.
 */

export type EvidenceSourceType = "assessment" | "quiz" | "mission" | "project" | "manual" | "reflection";

export type EvidenceObservation = {
  /** 0..1 demonstrated ability on this observation. */
  score: number;
  /** 0..1 how much this observation should move the estimate. */
  confidence: number;
  sourceType: EvidenceSourceType;
  createdAt: Date;
};

export type SkillEstimate = {
  /** 0..1, or 0 when there is no evidence. */
  ability: number;
  /** 0..1, how sure the system is about `ability`. */
  confidence: number;
  evidenceCount: number;
};

export const SOURCE_WEIGHT: Record<EvidenceSourceType, number> = {
  project: 1.5,
  mission: 1.25,
  assessment: 1,
  quiz: 0.8,
  manual: 0.5,
  reflection: 0.3,
};

export const RECENCY_HALF_LIFE_DAYS = 60;

/** Where an estimate starts before evidence, and how hard that start pulls. */
const PRIOR_ABILITY = 0.5;
const PRIOR_WEIGHT = 0.5;

/** Total weight at which confidence reaches about 63% (before the consistency penalty). */
const CONFIDENCE_SCALE = 2;

/** Largest possible variance of scores in 0..1. Full disagreement halves confidence. */
const MAX_VARIANCE = 0.25;
const MAX_INCONSISTENCY_PENALTY = 0.5;

const DAY_MS = 24 * 60 * 60 * 1000;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function recencyWeight(createdAt: Date, now: Date): number {
  const ageDays = Math.max(0, (now.getTime() - createdAt.getTime()) / DAY_MS);
  return 0.5 ** (ageDays / RECENCY_HALF_LIFE_DAYS);
}

export function observationWeight(observation: EvidenceObservation, now: Date): number {
  return (
    clamp01(observation.confidence) *
    SOURCE_WEIGHT[observation.sourceType] *
    recencyWeight(observation.createdAt, now)
  );
}

export function estimateSkill(observations: EvidenceObservation[], now: Date = new Date()): SkillEstimate {
  const weighted = observations
    .map((observation) => ({
      score: clamp01(observation.score),
      weight: observationWeight(observation, now),
    }))
    .filter((entry) => entry.weight > 0);

  if (weighted.length === 0) {
    return { ability: 0, confidence: 0, evidenceCount: observations.length };
  }

  const totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  const weightedScore = weighted.reduce((sum, entry) => sum + entry.weight * entry.score, 0);

  const ability = (weightedScore + PRIOR_WEIGHT * PRIOR_ABILITY) / (totalWeight + PRIOR_WEIGHT);

  const mean = weightedScore / totalWeight;
  const variance =
    weighted.reduce((sum, entry) => sum + entry.weight * (entry.score - mean) ** 2, 0) / totalWeight;
  const consistency = 1 - MAX_INCONSISTENCY_PENALTY * Math.min(1, variance / MAX_VARIANCE);
  const amount = 1 - Math.exp(-totalWeight / CONFIDENCE_SCALE);

  return {
    ability: round(clamp01(ability)),
    confidence: round(clamp01(amount * consistency)),
    evidenceCount: observations.length,
  };
}

export type AbilityBand = "beginner" | "developing" | "intermediate" | "strong";

/** Display band for the profile UI. */
export function abilityBand(ability: number): AbilityBand {
  if (ability >= 0.8) return "strong";
  if (ability >= 0.55) return "intermediate";
  if (ability >= 0.3) return "developing";
  return "beginner";
}

export type ConfidenceBand = "low" | "medium" | "high";

/** Low confidence means "we think so, but need more evidence": the UI hatches the meter. */
export function confidenceBand(confidence: number): ConfidenceBand {
  if (confidence >= 0.75) return "high";
  if (confidence >= 0.4) return "medium";
  return "low";
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}
