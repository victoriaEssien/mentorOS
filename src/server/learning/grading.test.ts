import { describe, expect, it } from "vitest";

import {
  CONFIDENCE,
  demonstratedAbility,
  gradeByRules,
  gradeFromModel,
  overallScore,
  snippet,
  verdictFor,
  type GradingItem,
} from "./grading";

const choiceItem: GradingItem = {
  id: "item-1",
  difficulty: 1,
  question: "What does Cache-Control: no-store tell caches to do?",
  options: ["Revalidate", "Keep until close", "Do not store", "Store if 200"],
  correctOption: 2,
  skillSlugs: ["http-caching"],
};

const writtenItem: GradingItem = {
  ...choiceItem,
  id: "item-2",
  difficulty: 4,
  options: null,
  correctOption: null,
  skillSlugs: ["http-caching", "web-security"],
};

describe("demonstratedAbility", () => {
  it("lets a right answer to a hard item prove more than one to an easy item", () => {
    expect(demonstratedAbility(1, 1)).toBe(0.6);
    expect(demonstratedAbility(3, 1)).toBe(0.8);
    expect(demonstratedAbility(5, 1)).toBe(1);
  });

  it("makes a wrong answer to a hard item cost less than one to an easy item", () => {
    expect(demonstratedAbility(1, 0)).toBe(0);
    expect(demonstratedAbility(5, 0)).toBe(0.4);
  });

  it("interpolates partial answers and clamps odd input", () => {
    expect(demonstratedAbility(3, 0.5)).toBe(0.5);
    expect(demonstratedAbility(9, 2)).toBe(1);
    expect(demonstratedAbility(0, Number.NaN)).toBe(0);
  });
});

describe("verdictFor", () => {
  it("bands answer quality", () => {
    expect([0.9, 0.85, 0.7, 0.6, 0.45, 0.3, 0.1].map(verdictFor)).toEqual([
      "strong",
      "strong",
      "pass",
      "pass",
      "partial",
      "partial",
      "fail",
    ]);
  });
});

describe("gradeByRules", () => {
  it("marks a right choice against the key, at guess-discounted confidence", () => {
    const grade = gradeByRules(choiceItem, { kind: "choice", option: 2 })!;
    expect(grade).toMatchObject({ score: 1, verdict: "strong", answer: "choice", gradedBy: "rules" });
    expect(grade.judgements).toEqual([
      expect.objectContaining({ skill: "http-caching", score: 0.6, confidence: CONFIDENCE.choiceRight }),
    ]);
    expect(grade.judgements[0].evidence).toMatch(/^Chose the right answer: “What does/);
  });

  it("marks a wrong choice as zero, and trusts it more than a right one", () => {
    const grade = gradeByRules(choiceItem, { kind: "choice", option: 0 })!;
    expect(grade).toMatchObject({ score: 0, verdict: "fail" });
    expect(grade.judgements[0]).toMatchObject({ score: 0, confidence: CONFIDENCE.choiceWrong });
  });

  it("scores I don't know and blanks as zero on every skill the item probes", () => {
    const unknown = gradeByRules(writtenItem, { kind: "unknown" })!;
    const blank = gradeByRules(writtenItem, { kind: "text", text: "   " })!;
    const missing = gradeByRules(writtenItem, undefined)!;

    expect(unknown.answer).toBe("unknown");
    expect(unknown.judgements[0].evidence).toMatch(/^Said “I don’t know”/);
    expect(blank.answer).toBe("blank");
    expect(missing.answer).toBe("blank");
    for (const grade of [unknown, blank, missing]) {
      expect(grade.score).toBe(0);
      expect(grade.judgements.map((j) => j.skill)).toEqual(["http-caching", "web-security"]);
      // Difficulty 4: not knowing a hard item is weaker evidence of a gap than missing an easy one.
      expect(grade.judgements.every((j) => j.score === 0.3)).toBe(true);
    }
  });

  it("leaves written answers to the model", () => {
    expect(gradeByRules(writtenItem, { kind: "text", text: "It means do not store it." })).toBeNull();
  });

  it("zeroes answers the player can't produce instead of guessing", () => {
    expect(gradeByRules(choiceItem, { kind: "text", text: "C" })!.answer).toBe("blank");
    expect(gradeByRules(writtenItem, { kind: "choice", option: 1 })!.answer).toBe("blank");
  });
});

describe("gradeFromModel", () => {
  it("applies difficulty to skill scores and keeps confidence in range", () => {
    const grade = gradeFromModel(writtenItem, {
      score: 0.8,
      skills: [
        { skill: "http-caching", score: 1, confidence: 0.99, evidence: "Named no-store correctly." },
        { skill: "web-security", score: 0, confidence: 0.05, evidence: "Didn't mention shared caches." },
      ],
      misconception: null,
      feedback: "Right about storage; shared caches matter too.",
    });

    expect(grade).toMatchObject({ score: 0.8, verdict: "pass", answer: "text", gradedBy: "model" });
    expect(grade.judgements).toEqual([
      expect.objectContaining({ skill: "http-caching", score: 0.9, confidence: CONFIDENCE.writtenMax }),
      expect.objectContaining({ skill: "web-security", score: 0.3, confidence: CONFIDENCE.writtenMin }),
    ]);
  });
});

describe("overallScore", () => {
  it("averages answer quality and treats an empty attempt as zero", () => {
    const right = gradeByRules(choiceItem, { kind: "choice", option: 2 })!;
    const wrong = gradeByRules(choiceItem, { kind: "choice", option: 1 })!;
    expect(overallScore([right, wrong, right])).toBe(0.667);
    expect(overallScore([])).toBe(0);
  });
});

describe("snippet", () => {
  it("quotes short questions whole and cuts long ones at a word", () => {
    expect(snippet("What is a join?")).toBe("“What is a join?”");
    const long = snippet(
      "A public repository accepts pull requests from anyone, and its CI job runs scripts from each pull request.",
    );
    expect(long.endsWith("…”")).toBe(true);
    expect(long.length).toBeLessThanOrEqual(83);
    expect(long).not.toMatch(/\s…/);
  });
});
