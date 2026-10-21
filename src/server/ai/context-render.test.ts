import { describe, expect, it } from "vitest";

import { deriveMomentum, missionPoints, renderLearnerContext, type LearnerContext } from "./context-render";

const base: LearnerContext = {
  userId: "u1",
  name: "Ada",
  tracks: [{ slug: "software-engineering", name: "Software Engineering" }],
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
  skills: [
    { skillId: "s1", slug: "sql", name: "SQL", ability: 0.68, confidence: 0.5, evidenceCount: 4 },
    { skillId: "s2", slug: "http", name: "HTTP", ability: 0.3, confidence: 0.2, evidenceCount: 1 },
  ],
  weakSkills: [],
  currentPath: null,
  currentMission: null,
  recentMissions: [],
  recentAssessments: [],
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
    expect(renderLearnerContext(base)).toContain(
      "Background (self-reported, not evidence): role: Junior developer",
    );
  });

  it("lists skills with ability, band and confidence", () => {
    const text = renderLearnerContext(base);
    expect(text).toContain("- sql (SQL): 68% intermediate, medium confidence, 4");
    expect(text).toContain("- http (HTTP): 30% developing, low confidence, 1");
  });

  it("says when there is no evidence or path yet", () => {
    const text = renderLearnerContext({ ...base, skills: [] });
    expect(text).toContain("SKILLS: no evidence yet.");
    expect(text).toContain("CURRENT PATH: none yet.");
  });

  it("adds momentum guidance but keeps standards fixed", () => {
    const text = renderLearnerContext({ ...base, tone: { preference: "direct", momentum: "struggling" } });
    expect(text).toContain("TONE: direct.");
    expect(text).toContain("struggled recently");
    expect(text).toContain("Tone never changes scores, verdicts or whether they are ready for something.");
  });

  it("renders the path in order with reasons", () => {
    const text = renderLearnerContext({
      ...base,
      currentPath: {
        focusSummary: "HTTP before caching",
        items: [
          {
            title: "HTTP fundamentals",
            reason: "Diagnostic gaps in status codes",
            status: "current",
            skill: "http",
          },
          { title: "Caching", reason: "Builds on HTTP", status: "upcoming", skill: "caching" },
        ],
      },
    });
    expect(text).toContain("CURRENT PATH: HTTP before caching");
    expect(text).toContain("1. [current] HTTP fundamentals (http): Diagnostic gaps in status codes");
    expect(text).toContain("2. [upcoming] Caching (caching): Builds on HTTP");
  });

  it("caps long lists so prompts stay bounded", () => {
    const skills = Array.from({ length: 40 }, (_, index) => ({
      skillId: `s${index}`,
      slug: `skill-${index}`,
      name: `Skill ${index}`,
      ability: 0.5,
      confidence: 0.5,
      evidenceCount: 1,
    }));
    const mistakes = Array.from({ length: 20 }, (_, index) => `mistake ${index}`);
    const text = renderLearnerContext({ ...base, skills, recentMistakes: mistakes });
    expect(text).toContain("- and 10 more");
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

  it("lets the mentor see where a mission lost its marks", () => {
    const text = renderLearnerContext({
      ...base,
      recentMissions: [
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
