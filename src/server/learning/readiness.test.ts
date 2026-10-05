import { describe, expect, it } from "vitest";

import {
  blockedSkills,
  evaluateReadiness,
  READY_ABILITY,
  type PrerequisiteEdge,
  type SkillState,
} from "./readiness";

const edges: PrerequisiteEdge[] = [
  { skillSlug: "caching", requiresSlug: "http" },
  { skillSlug: "kubernetes", requiresSlug: "containers" },
  { skillSlug: "kubernetes", requiresSlug: "networking" },
];

const states = (entries: Record<string, SkillState>) => new Map(Object.entries(entries));

describe("evaluateReadiness", () => {
  it("is ready when a skill has no prerequisites", () => {
    expect(evaluateReadiness("http", edges, states({}))).toEqual({ ready: true });
  });

  it("is ready when every prerequisite is demonstrated with enough confidence", () => {
    const result = evaluateReadiness(
      "kubernetes",
      edges,
      states({
        containers: { ability: 0.7, confidence: 0.6 },
        networking: { ability: 0.65, confidence: 0.5 },
      }),
    );
    expect(result).toEqual({ ready: true });
  });

  it("names each prerequisite that falls short", () => {
    const result = evaluateReadiness(
      "kubernetes",
      edges,
      states({
        containers: { ability: 0.7, confidence: 0.6 },
        networking: { ability: 0.41, confidence: 0.5 },
      }),
    );
    expect(result).toEqual({
      ready: false,
      missing: [{ skillSlug: "networking", ability: 0.41, confidence: 0.5, required: READY_ABILITY }],
    });
  });

  it("treats a high score with too little evidence as not ready", () => {
    const result = evaluateReadiness("caching", edges, states({ http: { ability: 0.9, confidence: 0.2 } }));
    expect(result.ready).toBe(false);
  });

  it("treats an unassessed prerequisite as not ready", () => {
    const result = evaluateReadiness("caching", edges, states({}));
    expect(result).toEqual({
      ready: false,
      missing: [{ skillSlug: "http", ability: 0, confidence: 0, required: READY_ABILITY }],
    });
  });
});

describe("blockedSkills", () => {
  it("lists only the blocked candidates, with what blocks them", () => {
    const result = blockedSkills(
      ["http", "caching", "kubernetes"],
      edges,
      states({ http: { ability: 0.8, confidence: 0.7 }, containers: { ability: 0.2, confidence: 0.5 } }),
    );
    expect(result).toEqual([{ skill: "kubernetes", missing: ["containers", "networking"] }]);
  });
});
