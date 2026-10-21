import { describe, expect, it } from "vitest";

import { hintDiscount, toEvidenceRows } from "./skill-profile-updater";

const source = { userId: "u1", sourceType: "assessment" as const, sourceId: "attempt-1" };
const skillIdBySlug = new Map([
  ["sql", "skill-sql"],
  ["http", "skill-http"],
]);

describe("toEvidenceRows", () => {
  it("maps judgements onto known skills", () => {
    const { rows, unknownSkills } = toEvidenceRows({
      source,
      skillIdBySlug,
      judgements: [{ skill: "sql", score: 0.8, confidence: 0.7, evidence: "Wrote a correct LEFT JOIN." }],
    });
    expect(unknownSkills).toEqual([]);
    expect(rows).toEqual([
      {
        userId: "u1",
        skillId: "skill-sql",
        sourceType: "assessment",
        sourceId: "attempt-1",
        score: 0.8,
        confidence: 0.7,
        evidenceSummary: "Wrote a correct LEFT JOIN.",
      },
    ]);
  });

  it("drops and reports skills outside the taxonomy", () => {
    const { rows, unknownSkills } = toEvidenceRows({
      source,
      skillIdBySlug,
      judgements: [
        { skill: "kubernetes", score: 1, confidence: 1, evidence: "x" },
        { skill: " HTTP ", score: 0.5, confidence: 0.5, evidence: "y" },
      ],
    });
    expect(unknownSkills).toEqual(["kubernetes"]);
    expect(rows.map((row) => row.skillId)).toEqual(["skill-http"]);
  });

  it("clamps values the model got wrong", () => {
    const { rows } = toEvidenceRows({
      source,
      skillIdBySlug,
      judgements: [{ skill: "sql", score: 1.4, confidence: Number.NaN, evidence: "z" }],
    });
    expect(rows[0]).toMatchObject({ score: 1, confidence: 0 });
  });

  it("lets hints reduce how much an answer counts, not what it scored", () => {
    const { rows } = toEvidenceRows({
      source,
      skillIdBySlug,
      hintsUsed: 2,
      judgements: [{ skill: "sql", score: 0.9, confidence: 0.8, evidence: "Got there after hints." }],
    });
    expect(rows[0].score).toBe(0.9);
    expect(rows[0].confidence).toBeCloseTo(0.4);
  });

  it("keeps summaries bounded", () => {
    const { rows } = toEvidenceRows({
      source,
      skillIdBySlug,
      judgements: [{ skill: "sql", score: 0.5, confidence: 0.5, evidence: "a".repeat(2000) }],
    });
    expect(rows[0].evidenceSummary.length).toBe(500);
  });
});

describe("hintDiscount", () => {
  it("shrinks with each hint and never goes negative", () => {
    expect(hintDiscount(0)).toBe(1);
    expect(hintDiscount(1)).toBeCloseTo(0.667, 2);
    expect(hintDiscount(2)).toBe(0.5);
    expect(hintDiscount(-3)).toBe(1);
  });
});
