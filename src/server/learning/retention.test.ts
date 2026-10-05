import { describe, expect, it } from "vitest";

import {
  hashToUnit,
  isSurpriseCheckDue,
  pickRetentionChecks,
  RETENTION_MIN_AGE_DAYS,
  SURPRISE_COOLDOWN_DAYS,
  type RetentionCandidate,
} from "./retention";

const NOW = new Date("2026-10-05T12:00:00Z");
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

const candidate = (overrides: Partial<RetentionCandidate> = {}): RetentionCandidate => ({
  skillSlug: "http",
  ability: 0.7,
  confidence: 0.6,
  evidenceCount: 3,
  lastEvidenceAt: daysAgo(30),
  ...overrides,
});

describe("pickRetentionChecks", () => {
  it("skips skills learned too recently", () => {
    expect(
      pickRetentionChecks([candidate({ lastEvidenceAt: daysAgo(RETENTION_MIN_AGE_DAYS - 1) })], NOW),
    ).toEqual([]);
  });

  it("skips skills the learner never showed they had", () => {
    expect(pickRetentionChecks([candidate({ ability: 0.3 })], NOW)).toEqual([]);
    expect(pickRetentionChecks([candidate({ evidenceCount: 0 })], NOW)).toEqual([]);
  });

  it("prefers older evidence", () => {
    const picked = pickRetentionChecks(
      [
        candidate({ skillSlug: "sql", lastEvidenceAt: daysAgo(20) }),
        candidate({ skillSlug: "dns", lastEvidenceAt: daysAgo(50) }),
      ],
      NOW,
    );
    expect(picked.map((c) => c.skillSlug)).toEqual(["dns"]);
  });

  it("prefers less certain estimates at the same age", () => {
    const picked = pickRetentionChecks(
      [
        candidate({ skillSlug: "sure", confidence: 0.95 }),
        candidate({ skillSlug: "unsure", confidence: 0.4 }),
      ],
      NOW,
    );
    expect(picked[0].skillSlug).toBe("unsure");
  });

  it("respects the limit and orders best first", () => {
    const picked = pickRetentionChecks(
      [
        candidate({ skillSlug: "a", lastEvidenceAt: daysAgo(15) }),
        candidate({ skillSlug: "b", lastEvidenceAt: daysAgo(45) }),
        candidate({ skillSlug: "c", lastEvidenceAt: daysAgo(30) }),
      ],
      NOW,
      2,
    );
    expect(picked.map((c) => c.skillSlug)).toEqual(["b", "c"]);
  });
});

describe("isSurpriseCheckDue", () => {
  it("never fires inside the cooldown", () => {
    expect(
      isSurpriseCheckDue({
        userId: "u1",
        lastSurpriseAt: daysAgo(SURPRISE_COOLDOWN_DAYS - 1),
        now: NOW,
        chance: 1,
      }),
    ).toBe(false);
  });

  it("gives the same answer all day", () => {
    const morning = new Date("2026-10-05T07:00:00Z");
    const evening = new Date("2026-10-05T21:00:00Z");
    expect(isSurpriseCheckDue({ userId: "u1", lastSurpriseAt: null, now: morning })).toBe(
      isSurpriseCheckDue({ userId: "u1", lastSurpriseAt: null, now: evening }),
    );
  });

  it("fires on some days and not others", () => {
    const answers = Array.from({ length: 60 }, (_, day) =>
      isSurpriseCheckDue({
        userId: "u1",
        lastSurpriseAt: null,
        now: new Date(NOW.getTime() + day * 86_400_000),
      }),
    );
    expect(answers.some(Boolean)).toBe(true);
    expect(answers.every(Boolean)).toBe(false);
  });
});

describe("hashToUnit", () => {
  it("is deterministic and stays in [0, 1)", () => {
    for (const input of ["", "a", "u1:2026-10-05", "a much longer input string"]) {
      const value = hashToUnit(input);
      expect(value).toBe(hashToUnit(input));
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
