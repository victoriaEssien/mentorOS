import { describe, expect, it } from "vitest";

import { DAILY_KINDS, DAILY_POOLS, dayNumber, planDailySet, type SkillRecord } from "./daily-plan";

const none = {
  skills: new Map<string, SkillRecord>(),
  blocked: new Set<string>(),
  recent: [] as string[],
  outcomes: new Map(),
};

describe("planDailySet", () => {
  it("asks one question of each kind, each on a different skill from its pool", () => {
    const set = planDailySet({ ...none, day: "2026-10-28" });
    expect(set.map((q) => q.kind)).toEqual([...DAILY_KINDS]);
    expect(new Set(set.map((q) => q.skill)).size).toBe(5);
    for (const question of set) expect(DAILY_POOLS[question.kind]).toContain(question.skill);
  });

  it("puts each of Go, Rust, C++ and Java in the day's set, rotating day to day", () => {
    const today = planDailySet({ ...none, day: "2026-10-28" });
    const whole = today.filter((q) => q.kind !== "algorithm").map((q) => q.language);
    expect([...whole].sort()).toEqual(["cpp", "go", "java", "rust"]);

    const tomorrow = planDailySet({ ...none, day: "2026-10-29" });
    expect(tomorrow.find((q) => q.kind === "program")!.language).not.toBe(
      today.find((q) => q.kind === "program")!.language,
    );
  });

  it("cycles the LeetCode-style problem through all six languages", () => {
    const start = dayNumber("2026-10-28");
    const languages = Array.from({ length: 6 }, (_, i) => {
      const day = new Date((start + i) * 86_400_000).toISOString().slice(0, 10);
      return planDailySet({ ...none, day }).find((q) => q.kind === "algorithm")!.language;
    });
    expect(new Set(languages).size).toBe(6);
  });

  it("goes for the weakest skill, skipping blocked and recent ones", () => {
    const skills = new Map<string, SkillRecord>(
      DAILY_POOLS.algorithm.map((slug) => [slug, { ability: 0.8, confidence: 0.8 }]),
    );
    skills.set("graphs", { ability: 0.1, confidence: 0.7 });
    skills.set("heaps", { ability: 0.15, confidence: 0.7 });
    skills.set("tries", { ability: 0.12, confidence: 0.7 });

    const algorithm = (blocked: string[], recent: string[]) =>
      planDailySet({ ...none, day: "2026-10-28", skills, blocked: new Set(blocked), recent }).find(
        (q) => q.kind === "algorithm",
      )!.skill;

    expect(algorithm([], [])).toBe("graphs");
    expect(algorithm(["graphs"], [])).toBe("tries");
    expect(algorithm(["graphs"], ["tries"])).toBe("heaps");
  });

  it("steps difficulty up after strong results and back after misses", () => {
    // Everything else is measured and strong, so graphs is the one asked about.
    const skills = new Map<string, SkillRecord>(
      Object.values(DAILY_POOLS)
        .flat()
        .map((slug) => [slug, { ability: 0.9, confidence: 0.9 }]),
    );
    skills.set("graphs", { ability: 0.1, confidence: 0.9 });
    const difficultyAfter = (outcome: "strong" | "fail") =>
      planDailySet({
        ...none,
        day: "2026-10-28",
        skills,
        outcomes: new Map([
          [
            "graphs",
            [
              { outcome, difficulty: 3 },
              { outcome, difficulty: 3 },
            ],
          ],
        ]),
      }).find((q) => q.skill === "graphs")!.difficulty;

    expect(difficultyAfter("strong")).toBeGreaterThan(3);
    expect(difficultyAfter("fail")).toBeLessThan(3);
  });
});
