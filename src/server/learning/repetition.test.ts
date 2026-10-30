import { describe, expect, it } from "vitest";

import { addDays, nextSchedule, pickReviews, verdictFor } from "./repetition";

describe("verdictFor", () => {
  it("is solid only with every point hit and nothing wrong", () => {
    expect(verdictFor(["hit", "hit", "hit"])).toBe("solid");
    expect(verdictFor(["hit", "hit", "missed"])).toBe("partly");
  });

  it("caps anything wrong at partly there, and needs most points for that", () => {
    expect(verdictFor(["hit", "hit", "hit", "wrong"])).toBe("partly");
    expect(verdictFor(["hit", "hit", "wrong", "missed"])).toBe("not_yet");
  });

  it("is not yet below half, or with nothing to grade", () => {
    expect(verdictFor(["hit", "missed", "missed"])).toBe("not_yet");
    expect(verdictFor([])).toBe("not_yet");
  });
});

describe("nextSchedule", () => {
  const today = "2026-10-30";

  it("pushes solid out along the ladder: 3, 7, 14, then 30 days", () => {
    let state = { step: 0, lastVerdict: null as "solid" | null };
    const intervals: number[] = [];
    for (let i = 0; i < 6; i++) {
      const next = nextSchedule(state, "solid", today);
      intervals.push(next.intervalDays);
      state = { step: next.step, lastVerdict: "solid" };
    }
    expect(intervals).toEqual([3, 7, 14, 30, 30, 30]);
  });

  it("brings partly there back in two days, or one after a not yet", () => {
    expect(nextSchedule({ step: 3, lastVerdict: "solid" }, "partly", today)).toEqual({
      step: 0,
      intervalDays: 2,
      nextReviewOn: "2026-11-01",
    });
    expect(nextSchedule({ step: 0, lastVerdict: "not_yet" }, "partly", today).intervalDays).toBe(1);
  });

  it("brings not yet back tomorrow and restarts the ladder", () => {
    expect(nextSchedule({ step: 4, lastVerdict: "solid" }, "not_yet", today)).toEqual({
      step: 0,
      intervalDays: 1,
      nextReviewOn: "2026-10-31",
    });
  });
});

describe("pickReviews", () => {
  const today = "2026-10-30";

  it("takes at most three, most overdue and shakiest first, and rolls the rest over", () => {
    const { picked, rolledOver } = pickReviews(
      [
        { conceptSlug: "solid-due-today", nextReviewOn: today, lastVerdict: "solid" },
        { conceptSlug: "not-yet-due-today", nextReviewOn: today, lastVerdict: "not_yet" },
        { conceptSlug: "solid-five-days-over", nextReviewOn: addDays(today, -5), lastVerdict: "solid" },
        { conceptSlug: "never-explained", nextReviewOn: today, lastVerdict: null },
        { conceptSlug: "partly-one-day-over", nextReviewOn: addDays(today, -1), lastVerdict: "partly" },
        { conceptSlug: "not-due", nextReviewOn: addDays(today, 2), lastVerdict: "partly" },
      ],
      today,
    );
    // Partly there a day over ties with not yet due today, and the tie goes to the more overdue.
    expect(picked).toEqual(["solid-five-days-over", "never-explained", "partly-one-day-over"]);
    expect(rolledOver).toBe(2);
  });

  it("leaves out today's new concept", () => {
    const { picked } = pickReviews(
      [{ conceptSlug: "new-one", nextReviewOn: today, lastVerdict: null }],
      today,
      {
        exclude: new Set(["new-one"]),
      },
    );
    expect(picked).toEqual([]);
  });
});
