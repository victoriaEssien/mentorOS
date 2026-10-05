import { describe, expect, it } from "vitest";

import { planSkillChanges } from "./evidence";
import type { EvidenceObservation } from "./skill-estimate";

const NOW = new Date("2026-10-05T12:00:00Z");

const prior: EvidenceObservation = { score: 0.4, confidence: 0.8, sourceType: "assessment", createdAt: NOW };

describe("planSkillChanges", () => {
  it("reports before and after for each skill the new evidence touches", () => {
    const changes = planSkillChanges(
      new Map([["sql", [prior]]]),
      [
        { skillId: "sql", score: 0.9, confidence: 0.9, sourceType: "mission" },
        { skillId: "http", score: 0.7, confidence: 0.6, sourceType: "assessment" },
      ],
      NOW,
    );

    expect(changes.map((change) => change.skillId)).toEqual(["sql", "http"]);

    const sql = changes[0];
    expect(sql.before.evidenceCount).toBe(1);
    expect(sql.after.evidenceCount).toBe(2);
    expect(sql.after.ability).toBeGreaterThan(sql.before.ability);

    const http = changes[1];
    expect(http.before).toEqual({ ability: 0, confidence: 0, evidenceCount: 0 });
    expect(http.after.evidenceCount).toBe(1);
  });

  it("groups several rows for the same skill into one change", () => {
    const changes = planSkillChanges(
      new Map(),
      [
        { skillId: "sql", score: 1, confidence: 1, sourceType: "assessment" },
        { skillId: "sql", score: 0, confidence: 1, sourceType: "assessment" },
      ],
      NOW,
    );
    expect(changes).toHaveLength(1);
    expect(changes[0].after.evidenceCount).toBe(2);
  });

  it("does nothing without new rows", () => {
    expect(planSkillChanges(new Map([["sql", [prior]]]), [], NOW)).toEqual([]);
  });
});
