import { describe, expect, it } from "vitest";

import { deriveMomentum, missionPoints, renderLearnerContext, type LearnerContext } from "./context-render";

const base: LearnerContext = {
  userId: "u1",
  name: "Ada",
  goals: ["Become job-ready"],
  background: {
    currentRole: "Junior developer",
    yearsExperience: 1,
    technologiesUsed: ["JavaScript", "React"],
    weeklyLearningHours: 6,
    learningStyle: "hands-on",
    previousLearning: null,
    existingProjects: null,
  },
  tone: { preference: "balanced", momentum: "steady" },
  currentTheme: null,
  currentProject: null,
  recentProjects: [],
  recentConcepts: [],
  recentMistakes: [],
};

describe("deriveMomentum", () => {
  it("is steady with no history", () => {
    expect(deriveMomentum([])).toBe("steady");
  });

  it("calls two fails in a row struggling", () => {
    expect(deriveMomentum(["fail", "fail", "strong"])).toBe("struggling");
  });

  it("calls mostly partial or failed work struggling", () => {
    expect(deriveMomentum(["partial", "pass", "fail", "partial"])).toBe("struggling");
  });

  it("calls a run of strong work cruising", () => {
    expect(deriveMomentum(["strong", "pass", "strong"])).toBe("cruising");
  });

  it("keeps mixed results steady", () => {
    expect(deriveMomentum(["pass", "partial", "pass"])).toBe("steady");
    expect(deriveMomentum(["strong", "strong"])).toBe("steady");
  });
});

describe("renderLearnerContext", () => {
  it("states background as self-reported, not evidence", () => {
    expect(renderLearnerContext(base)).toContain("Background (self-reported): role: Junior developer");
  });

  it("says when there's no project, and lists concepts with how they went", () => {
    const text = renderLearnerContext({
      ...base,
      recentConcepts: [
        { title: "Idempotency", day: "2026-10-30", verdict: "partly" },
        { title: "Indexes", day: "2026-10-29", verdict: null },
      ],
    });
    expect(text).toContain("CURRENT PROJECT: none right now.");
    expect(text).toContain("- 2026-10-30 Idempotency: partly there");
    expect(text).toContain("- 2026-10-29 Indexes: not explained");
  });

  it("shows the current project with its stack and due date", () => {
    const text = renderLearnerContext({
      ...base,
      currentProject: {
        id: "p1",
        title: "Stripe checkout",
        stack: "Your stack: Next.js",
        objective: "Take a payment end to end.",
        status: "in_progress",
        dueAt: "2026-11-06T09:00:00.000Z",
      },
    });
    expect(text).toContain(
      "CURRENT PROJECT (in progress, due 2026-11-06): Stripe checkout [Your stack: Next.js]. Take a payment end to end.",
    );
  });

  it("adds momentum guidance but keeps standards fixed", () => {
    const text = renderLearnerContext({ ...base, tone: { preference: "direct", momentum: "struggling" } });
    expect(text).toContain("TONE: direct.");
    expect(text).toContain("struggled recently");
    expect(text).toContain("Tone never changes scores or verdicts.");
  });

  it("caps long lists so prompts stay bounded", () => {
    const mistakes = Array.from({ length: 20 }, (_, index) => `mistake ${index}`);
    const text = renderLearnerContext({ ...base, recentMistakes: mistakes });
    expect(text).toContain("mistake 7");
    expect(text).not.toContain("mistake 8");
  });
});

describe("missionPoints", () => {
  const criteria = [
    { key: "accuracy", maxScore: 10 },
    { key: "checks", maxScore: 10 },
  ];

  it("totals each criterion against its maximum", () => {
    expect(
      missionPoints(
        {
          criteria: [
            { key: "accuracy", score: 5 },
            { key: "checks", score: 3 },
          ],
        },
        criteria,
      ),
    ).toEqual({
      scored: 8,
      available: 20,
      criteria: [
        { key: "accuracy", score: 5, max: 10 },
        { key: "checks", score: 3, max: 10 },
      ],
    });
  });

  it("scores a criterion the evaluation skipped as zero", () => {
    expect(missionPoints({ criteria: [{ key: "accuracy", score: 7 }] }, criteria)?.scored).toBe(7);
  });

  it("is null without stored criteria or mission criteria", () => {
    expect(missionPoints({ outcome: "pass" }, criteria)).toBeNull();
    expect(missionPoints({ criteria: [] }, [])).toBeNull();
    expect(missionPoints(null, criteria)).toBeNull();
  });

  it("lets the mentor see where a project lost its marks", () => {
    const text = renderLearnerContext({
      ...base,
      recentProjects: [
        {
          title: "Clean an order log",
          outcome: "partial",
          completedAt: null,
          points: missionPoints(
            {
              criteria: [
                { key: "accuracy", score: 5 },
                { key: "checks", score: 3 },
              ],
            },
            criteria,
          ),
        },
      ],
    });
    expect(text).toContain("- Clean an order log: partial, 8/20 (accuracy 5/10, checks 3/10)");
  });
});
