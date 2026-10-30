import { describe, expect, it } from "vitest";

import { BACKEND_POOL, DEFAULT_HOME_STACK, FRONTEND_POOL, planStack, stackLabel } from "./mission-stack";

const mine = ["Next.js", "Python"];

/** The candidates of an exploring plan; fails the test if the plan stays home. */
function explored(plan: ReturnType<typeof planStack>) {
  if (plan.mode !== "explore") throw new Error("expected an exploration");
  return plan.candidates;
}

describe("planStack", () => {
  it("explores on every third project and stays home otherwise", () => {
    const modes = Array.from(
      { length: 6 },
      (_, given) => planStack({ given, technologiesUsed: mine, side: "backend" }).mode,
    );
    expect(modes).toEqual(["home", "home", "explore", "home", "home", "explore"]);
  });

  it("uses their own technologies at home, or the default stack when there are none", () => {
    expect(planStack({ given: 0, technologiesUsed: mine, side: "frontend" })).toEqual({
      mode: "home",
      technologies: mine,
    });
    expect(planStack({ given: 0, technologiesUsed: [" "], side: "frontend" })).toEqual({
      mode: "home",
      technologies: DEFAULT_HOME_STACK,
    });
  });

  it("explores frameworks on frontend themes and services on backend ones", () => {
    const frontend = explored(planStack({ given: 2, technologiesUsed: mine, side: "frontend" }));
    const backend = explored(planStack({ given: 2, technologiesUsed: mine, side: "backend" }));
    expect(frontend.every((tool) => FRONTEND_POOL.includes(tool))).toBe(true);
    expect(backend.every((tool) => BACKEND_POOL.includes(tool))).toBe(true);
  });

  it("mixes both sides on full-stack themes", () => {
    const tools = explored(planStack({ given: 2, technologiesUsed: mine, side: "full stack" }));
    expect(tools.some((tool) => FRONTEND_POOL.includes(tool))).toBe(true);
    expect(tools.some((tool) => BACKEND_POOL.includes(tool))).toBe(true);
  });

  it("never offers a tool they already use", () => {
    const known = ["Vue.js", "SvelteKit", "Redis", "Docker", "REST APIs"];
    for (const given of [2, 5, 8, 11]) {
      for (const side of ["frontend", "backend", "full stack"] as const) {
        const tools = explored(planStack({ given, technologiesUsed: known, side }));
        expect(tools).not.toContain("Vue");
        expect(tools).not.toContain("Svelte (SvelteKit)");
        expect(tools).not.toContain("Redis");
        expect(tools).not.toContain("Docker and Docker Compose");
      }
    }
    // "REST APIs" is not the same tool as "an LLM API".
    const backend = Array.from({ length: 4 }, (_, i) =>
      explored(planStack({ given: 2 + i * 3, technologiesUsed: known, side: "backend" })),
    ).flat();
    expect(backend).toContain("an LLM API with structured output");
  });

  it("offers different tools on consecutive explorations", () => {
    const first = explored(planStack({ given: 2, technologiesUsed: mine, side: "backend" }));
    const second = explored(planStack({ given: 5, technologiesUsed: mine, side: "backend" }));
    expect(first).toHaveLength(3);
    expect(second.some((tool) => first.includes(tool))).toBe(false);
  });
});

describe("stackLabel", () => {
  it("says which kind of project it is", () => {
    expect(stackLabel({ mode: "home", technologies: mine }, "Next.js")).toBe("Your stack: Next.js");
    expect(stackLabel({ mode: "explore", candidates: [] }, "Redis")).toBe("Exploring: Redis");
  });
});
