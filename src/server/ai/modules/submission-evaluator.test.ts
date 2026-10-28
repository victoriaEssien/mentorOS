import { describe, expect, it, vi } from "vitest";

import { tidyEvaluation, type EvaluatedMission } from "./submission-evaluator";

// Only the pure tidying is under test; keep the model client (and its env checks) out of it.
vi.mock("../generate", () => ({ generateStructured: vi.fn() }));

const mission: EvaluatedMission = {
  title: "Guard a stock update",
  type: "debug",
  difficulty: 3,
  objective: "Stop overselling.",
  deliverable: "A gist.",
  instructions: "1. Do it.",
  acceptanceCriteria: [],
  criteria: [
    { key: "correctness", label: "Correctness", description: "Never oversells.", maxScore: 10 },
    { key: "reasoning", label: "Reasoning", description: "Explains why.", maxScore: 10 },
  ],
  skills: [
    { slug: "sql", name: "SQL" },
    { slug: "transactions", name: "Transactions" },
  ],
};

describe("tidyEvaluation", () => {
  it("scores every mission criterion, zeroing the ones the model skipped", () => {
    const result = tidyEvaluation(
      {
        criteria: [
          { key: "Correctness", score: 12, comment: "Works — always." },
          { key: "style", score: 9, comment: "Not a criterion." },
        ],
        skills: [{ skill: "SQL", score: 0.8, confidence: 0.7, evidence: "Guarded UPDATE." }],
        strengths: ["Guard in the WHERE clause", " "],
        weaknesses: [],
        why: "Locks don't add conditions.",
        recommendedNextStep: "Write the reasoning.",
        unseen: "The captured output",
      },
      mission,
    );

    expect(result.criteria).toEqual([
      { key: "correctness", score: 10, comment: "Works, always." },
      { key: "reasoning", score: 0, comment: "Not shown in what was handed in." },
    ]);
    expect(result.strengths).toEqual(["Guard in the WHERE clause"]);
    expect(result.unseen).toBe("The captured output");
  });

  it("keeps skills to the mission's, filling missing ones from the overall score", () => {
    const result = tidyEvaluation(
      {
        criteria: [
          { key: "correctness", score: 6, comment: "Mostly." },
          { key: "reasoning", score: 4, comment: "Thin." },
        ],
        skills: [{ skill: "kubernetes", score: 1, confidence: 1, evidence: "Not practised here." }],
        strengths: [],
        weaknesses: ["No captured output"],
        why: "Evidence needs output.",
        recommendedNextStep: "Rerun and paste the output.",
        unseen: null,
      },
      mission,
    );

    expect(result.skills).toEqual([
      { skill: "sql", score: 0.5, confidence: 0.3, evidence: "Judged from the work as a whole." },
      { skill: "transactions", score: 0.5, confidence: 0.3, evidence: "Judged from the work as a whole." },
    ]);
  });
});
