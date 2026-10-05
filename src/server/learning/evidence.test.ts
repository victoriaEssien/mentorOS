import { describe, expect, it } from "vitest";

import { planSkillChanges, replayEvidence } from "./evidence";
import { estimateSkill, type EvidenceObservation } from "./skill-estimate";

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

describe("replayEvidence", () => {
  const at = (day: number) => new Date(Date.UTC(2026, 9, day, 12));
  const observation = (day: number, score: number, confidence = 0.6): EvidenceObservation => ({
    score,
    confidence,
    sourceType: "assessment",
    createdAt: at(day),
  });

  it("orders oldest first and measures the first observation from the neutral start", () => {
    const steps = replayEvidence([observation(3, 0.2), observation(1, 0.9)]);

    expect(steps.map((step) => step.createdAt)).toEqual([at(1), at(3)]);
    expect(steps[0].abilityBefore).toBe(0.5);
    expect(steps[0].delta).toBeGreaterThan(0);
    // Measured at the second observation's time, so the first has decayed a little since.
    expect(steps[1].abilityBefore).toBeCloseTo(steps[0].abilityAfter, 2);
    expect(steps[1].delta).toBeLessThan(0);
  });

  it("ends where the estimate over everything ends", () => {
    const all = [observation(1, 0.9), observation(2, 0.4), observation(5, 0.7, 0.9)];
    const steps = replayEvidence(all);
    expect(steps.at(-1)!.abilityAfter).toBe(estimateSkill(all, at(5)).ability);
  });

  it("keeps the caller's fields", () => {
    const [step] = replayEvidence([{ ...observation(1, 0.8), id: "row-1" }]);
    expect(step.id).toBe("row-1");
  });
});
