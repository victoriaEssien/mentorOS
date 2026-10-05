import { describe, expect, it, vi } from "vitest";

import { tidyGrade } from "./skill-evaluator";

// Only the pure tidying is under test; keep the model client (and its env checks) out of it.
vi.mock("../generate", () => ({ generateStructured: vi.fn() }));

const skills = [
  { slug: "http-caching", name: "HTTP caching", description: null },
  { slug: "web-security", name: "Web security", description: null },
];

describe("tidyGrade", () => {
  it("keeps only the item's skills and fills the ones the model skipped at low confidence", () => {
    const grade = tidyGrade(
      {
        score: 0.7,
        skills: [
          { skill: " HTTP-Caching ", score: 0.9, confidence: 0.8, evidence: "Named no-store." },
          { skill: "kubernetes", score: 1, confidence: 1, evidence: "Not probed by this item." },
        ],
        misconception: null,
        feedback: "Mostly right.",
      },
      skills,
    );

    expect(grade.skills).toEqual([
      { skill: "http-caching", score: 0.9, confidence: 0.8, evidence: "Named no-store." },
      { skill: "web-security", score: 0.7, confidence: 0.3, evidence: "Judged from the answer as a whole." },
    ]);
  });

  it("replaces em dashes in learner-facing text", () => {
    const grade = tidyGrade(
      {
        score: 0.4,
        skills: [{ skill: "http-caching", score: 0.4, confidence: 0.5, evidence: "Close — but not quite." }],
        misconception: "Thinks no-cache — means never store",
        feedback: "You named the header—then mixed it up.",
      },
      skills.slice(0, 1),
    );

    expect(grade.skills[0].evidence).toBe("Close, but not quite.");
    expect(grade.misconception).toBe("Thinks no-cache, means never store");
    expect(grade.feedback).toBe("You named the header, then mixed it up.");
  });
});
