import { describe, expect, it } from "vitest";

import {
  abilityBand,
  confidenceBand,
  estimateSkill,
  RECENCY_HALF_LIFE_DAYS,
  recencyWeight,
  type EvidenceObservation,
} from "./skill-estimate";

const NOW = new Date("2026-10-05T12:00:00Z");
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

const obs = (overrides: Partial<EvidenceObservation> = {}): EvidenceObservation => ({
  score: 1,
  confidence: 1,
  sourceType: "assessment",
  createdAt: NOW,
  ...overrides,
});

describe("estimateSkill", () => {
  it("claims nothing without evidence", () => {
    expect(estimateSkill([], NOW)).toEqual({ ability: 0, confidence: 0, evidenceCount: 0 });
  });

  it("shrinks a single observation toward the middle and keeps confidence modest", () => {
    const { ability, confidence } = estimateSkill([obs({ score: 1 })], NOW);
    expect(ability).toBeGreaterThan(0.6);
    expect(ability).toBeLessThan(1);
    expect(confidence).toBeLessThan(0.5);
  });

  it("trusts many consistent observations", () => {
    const many = Array.from({ length: 6 }, () => obs({ score: 0.9 }));
    const { ability, confidence } = estimateSkill(many, NOW);
    expect(ability).toBeGreaterThan(0.85);
    expect(confidence).toBeGreaterThan(0.9);
  });

  it("is less confident when observations disagree", () => {
    const consistent = estimateSkill([obs({ score: 0.6 }), obs({ score: 0.6 }), obs({ score: 0.6 })], NOW);
    const mixed = estimateSkill([obs({ score: 0.1 }), obs({ score: 1 }), obs({ score: 0.7 })], NOW);
    expect(mixed.confidence).toBeLessThan(consistent.confidence);
  });

  it("lets old evidence fade, so confidence decays with time", () => {
    const fresh = estimateSkill([obs(), obs(), obs()], NOW);
    const stale = estimateSkill(
      [obs({ createdAt: daysAgo(180) }), obs({ createdAt: daysAgo(180) }), obs({ createdAt: daysAgo(180) })],
      NOW,
    );
    expect(stale.confidence).toBeLessThan(fresh.confidence);
  });

  it("follows recent performance over old performance", () => {
    const { ability } = estimateSkill(
      [obs({ score: 1, createdAt: daysAgo(240) }), obs({ score: 0.2 }), obs({ score: 0.2 })],
      NOW,
    );
    expect(ability).toBeLessThan(0.45);
  });

  it("weights a failed project above a passed quiz", () => {
    const { ability } = estimateSkill(
      [obs({ score: 1, sourceType: "quiz" }), obs({ score: 0, sourceType: "project" })],
      NOW,
    );
    expect(ability).toBeLessThan(0.5);
  });

  it("barely moves on a low-confidence observation", () => {
    const base = [obs({ score: 0.8 }), obs({ score: 0.8 }), obs({ score: 0.8 })];
    const withShaky = estimateSkill([...base, obs({ score: 0, confidence: 0.05 })], NOW);
    expect(withShaky.ability).toBeGreaterThan(estimateSkill(base, NOW).ability - 0.03);
  });

  it("counts every observation it was given", () => {
    expect(estimateSkill([obs(), obs({ confidence: 0 })], NOW).evidenceCount).toBe(2);
  });

  it("clamps out-of-range inputs", () => {
    const { ability, confidence } = estimateSkill([obs({ score: 3, confidence: 4 })], NOW);
    expect(ability).toBeLessThanOrEqual(1);
    expect(confidence).toBeLessThanOrEqual(1);
  });

  it("is deterministic for a fixed clock", () => {
    const input = [obs({ score: 0.4, createdAt: daysAgo(10) }), obs({ score: 0.9, sourceType: "mission" })];
    expect(estimateSkill(input, NOW)).toEqual(estimateSkill(input, NOW));
  });
});

describe("recencyWeight", () => {
  it("halves every half-life", () => {
    expect(recencyWeight(NOW, NOW)).toBe(1);
    expect(recencyWeight(daysAgo(RECENCY_HALF_LIFE_DAYS), NOW)).toBeCloseTo(0.5);
    expect(recencyWeight(daysAgo(RECENCY_HALF_LIFE_DAYS * 2), NOW)).toBeCloseTo(0.25);
  });

  it("treats future timestamps as now", () => {
    expect(recencyWeight(new Date(NOW.getTime() + 1000), NOW)).toBe(1);
  });
});

describe("bands", () => {
  it("maps ability to display bands", () => {
    expect(abilityBand(0)).toBe("beginner");
    expect(abilityBand(0.3)).toBe("developing");
    expect(abilityBand(0.55)).toBe("intermediate");
    expect(abilityBand(0.8)).toBe("strong");
  });

  it("maps confidence to bands", () => {
    expect(confidenceBand(0.2)).toBe("low");
    expect(confidenceBand(0.4)).toBe("medium");
    expect(confidenceBand(0.75)).toBe("high");
  });
});
