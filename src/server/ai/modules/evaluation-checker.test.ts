import { describe, expect, it, vi } from "vitest";

import type { EvaluationCorrection, SubmissionEvaluation } from "../schemas";
import { applyCorrections } from "./evaluation-checker";

// Only applying fixes is under test; keep the model client (and its env checks) out of it.
vi.mock("../generate", () => ({ generateStructured: vi.fn() }));

const mission = {
  criteria: [
    { key: "accuracy", label: "Accuracy", description: "", maxScore: 10 },
    { key: "checks", label: "Checks", description: "", maxScore: 10 },
  ],
};

const firstLook: SubmissionEvaluation = {
  criteria: [
    { key: "accuracy", score: 6, comment: "Rows are classified correctly." },
    {
      key: "checks",
      score: 3,
      comment: "Your COUNTIFS check counts valid labels, because its two conditions are combined with OR.",
    },
  ],
  skills: [{ skill: "data-cleaning", score: 0.5, confidence: 0.6, evidence: "Classified rows." }],
  strengths: ["You kept the raw sheet unchanged."],
  weaknesses: [
    "COUNTIFS with two not-equal conditions on one range counts valid labels.",
    "No dates checked.",
  ],
  why: "Checks have to count exactly the rows that break a rule.",
  recommendedNextStep: "Add a date check.",
  unseen: null,
};

const correction = (fields: Partial<EvaluationCorrection>): EvaluationCorrection => ({
  part: "criterion",
  criterion: null,
  position: null,
  wrongClaim: "COUNTIFS combines its conditions with OR",
  reason: "COUNTIFS joins its conditions with AND, so it counts only labels that are neither.",
  fixed: "",
  score: null,
  ...fields,
});

describe("applyCorrections", () => {
  it("fixes a wrong comment and gives back the marks it cost", () => {
    const { evaluation, applied } = applyCorrections(
      firstLook,
      [
        correction({
          criterion: "Checks",
          fixed: "Your COUNTIFS check is right: it counts labels that are neither East nor West.",
          score: 7.2,
        }),
      ],
      mission,
    );
    expect(evaluation.criteria[1]).toEqual({
      key: "checks",
      score: 7,
      comment: "Your COUNTIFS check is right: it counts labels that are neither East nor West.",
    });
    expect(applied).toEqual([
      expect.objectContaining({
        target: "checks",
        scoreBefore: 3,
        scoreAfter: 7,
        before: firstLook.criteria[1].comment,
      }),
    ]);
    // Untouched parts stay as they were, and skill judgements are never changed.
    expect(evaluation.criteria[0]).toEqual(firstLook.criteria[0]);
    expect(evaluation.skills).toEqual(firstLook.skills);
  });

  it("keeps a corrected score inside the criterion's range", () => {
    const { evaluation } = applyCorrections(
      firstLook,
      [correction({ criterion: "checks", fixed: "Fine.", score: 14 })],
      mission,
    );
    expect(evaluation.criteria[1].score).toBe(10);
  });

  it("replaces or drops list entries by their position", () => {
    const { evaluation, applied } = applyCorrections(
      firstLook,
      [
        correction({ part: "weakness", position: 1, fixed: "" }),
        correction({ part: "strength", position: 1, fixed: "You kept the raw sheet unchanged for tracing." }),
      ],
      mission,
    );
    expect(evaluation.weaknesses).toEqual(["No dates checked."]);
    expect(evaluation.strengths).toEqual(["You kept the raw sheet unchanged for tracing."]);
    expect(applied.map((c) => c.target)).toEqual(["weakness 1", "strength 1"]);
    expect(applied[0].after).toBeNull();
  });

  it("ignores fixes that point at nothing", () => {
    const { evaluation, applied } = applyCorrections(
      firstLook,
      [
        correction({ criterion: "speed", fixed: "Fast.", score: 9 }),
        correction({ part: "weakness", position: 7, fixed: "x" }),
        correction({ part: "why", fixed: "" }),
        correction({ criterion: "checks", fixed: "", score: null }),
      ],
      mission,
    );
    expect(applied).toEqual([]);
    expect(evaluation).toEqual(firstLook);
  });

  it("rewrites the why and the next step, without em dashes", () => {
    const { evaluation } = applyCorrections(
      firstLook,
      [
        correction({ part: "why", fixed: "Checks count rule-breaking rows — nothing else." }),
        correction({ part: "nextStep", fixed: "Add a check for blank dates." }),
      ],
      mission,
    );
    expect(evaluation.why).toBe("Checks count rule-breaking rows, nothing else.");
    expect(evaluation.recommendedNextStep).toBe("Add a check for blank dates.");
  });
});
