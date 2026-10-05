import { describe, expect, it } from "vitest";

import { baselineDifficulty, MAX_DIFFICULTY, MIN_DIFFICULTY, planDifficulty } from "./difficulty";

describe("baselineDifficulty", () => {
  it("maps ability onto the five levels", () => {
    expect(baselineDifficulty(0)).toBe(1);
    expect(baselineDifficulty(0.25)).toBe(2);
    expect(baselineDifficulty(0.5)).toBe(3);
    expect(baselineDifficulty(0.7)).toBe(4);
    expect(baselineDifficulty(0.95)).toBe(5);
    expect(baselineDifficulty(1)).toBe(5);
  });
});

describe("planDifficulty", () => {
  it("starts at the learner's current estimate", () => {
    expect(planDifficulty({ ability: 0.5, recentOutcomes: [] })).toMatchObject({
      difficulty: 3,
      mode: "consolidate",
    });
  });

  it("raises the bar after a strong result", () => {
    expect(planDifficulty({ ability: 0.5, recentOutcomes: ["strong"], lastDifficulty: 3 })).toMatchObject({
      difficulty: 4,
      mode: "advance",
    });
  });

  it("raises the bar after two clean passes", () => {
    expect(
      planDifficulty({ ability: 0.5, recentOutcomes: ["pass", "strong"], lastDifficulty: 3 }),
    ).toMatchObject({
      difficulty: 4,
      mode: "advance",
    });
  });

  it("confirms a single pass at the same level", () => {
    expect(
      planDifficulty({ ability: 0.5, recentOutcomes: ["pass", "fail"], lastDifficulty: 3 }),
    ).toMatchObject({
      difficulty: 3,
      mode: "consolidate",
    });
  });

  it("holds after a partial", () => {
    expect(planDifficulty({ ability: 0.5, recentOutcomes: ["partial"], lastDifficulty: 4 }).difficulty).toBe(
      4,
    );
  });

  it("steps back one level after a fail", () => {
    expect(
      planDifficulty({ ability: 0.5, recentOutcomes: ["fail", "pass"], lastDifficulty: 4 }),
    ).toMatchObject({
      difficulty: 3,
      mode: "consolidate",
    });
  });

  it("goes back to fundamentals after two fails", () => {
    expect(
      planDifficulty({ ability: 0.5, recentOutcomes: ["fail", "fail"], lastDifficulty: 4 }),
    ).toMatchObject({
      difficulty: 2,
      mode: "remediate",
    });
  });

  it("never leaves the 1 to 5 range", () => {
    expect(planDifficulty({ ability: 1, recentOutcomes: ["strong"], lastDifficulty: 5 }).difficulty).toBe(
      MAX_DIFFICULTY,
    );
    expect(
      planDifficulty({ ability: 0, recentOutcomes: ["fail", "fail"], lastDifficulty: 1 }).difficulty,
    ).toBe(MIN_DIFFICULTY);
  });

  it("always explains itself", () => {
    for (const outcomes of [[], ["strong"], ["pass"], ["partial"], ["fail"], ["fail", "fail"]] as const) {
      expect(planDifficulty({ ability: 0.5, recentOutcomes: outcomes }).reason.length).toBeGreaterThan(10);
    }
  });
});
