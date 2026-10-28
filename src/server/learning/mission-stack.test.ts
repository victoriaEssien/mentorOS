import { describe, expect, it } from "vitest";

import { DEFAULT_HOME_STACK, planStack, stackLabel } from "./mission-stack";

const mine = ["Next.js", "Python"];

describe("planStack", () => {
  it("explores on every third daily mission and stays home otherwise", () => {
    const modes = Array.from(
      { length: 6 },
      (_, given) => planStack({ cadence: "daily", given, technologiesUsed: mine }).mode,
    );
    expect(modes).toEqual(["home", "home", "explore", "home", "home", "explore"]);
  });

  it("explores on two in three weekly challenges", () => {
    const modes = Array.from(
      { length: 3 },
      (_, given) => planStack({ cadence: "weekly", given, technologiesUsed: mine }).mode,
    );
    expect(modes).toEqual(["explore", "explore", "home"]);
  });

  it("uses their own technologies at home, or the default stack when there are none", () => {
    expect(planStack({ cadence: "daily", given: 0, technologiesUsed: mine })).toEqual({
      mode: "home",
      technologies: mine,
    });
    expect(planStack({ cadence: "daily", given: 0, technologiesUsed: [" "] })).toEqual({
      mode: "home",
      technologies: DEFAULT_HOME_STACK,
    });
  });

  it("offers different tools on consecutive explorations", () => {
    const first = planStack({ cadence: "daily", given: 2, technologiesUsed: mine });
    const second = planStack({ cadence: "daily", given: 5, technologiesUsed: mine });
    if (first.mode !== "explore" || second.mode !== "explore") throw new Error("expected explorations");
    expect(first.candidates).toHaveLength(3);
    expect(second.candidates.some((tool) => first.candidates.includes(tool))).toBe(false);
  });
});

describe("stackLabel", () => {
  it("says which kind of mission it is", () => {
    expect(stackLabel({ mode: "home", technologies: mine }, "Next.js")).toBe("Your stack: Next.js");
    expect(stackLabel({ mode: "explore", candidates: [] }, "Redis")).toBe("Exploring: Redis");
  });
});
