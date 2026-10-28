import { describe, expect, it } from "vitest";

import { durationLabel, instructionSteps, tallyLabel, timeLeftLabel } from "./mission-labels";

describe("durationLabel", () => {
  it("reads in minutes under an hour and a half, hours after", () => {
    expect(durationLabel(47)).toBe("About 45 minutes");
    expect(durationLabel(240)).toBe("About 4 hours");
    expect(durationLabel(195)).toBe("About 3.5 hours");
    expect(durationLabel(null)).toBeNull();
  });
});

describe("instructionSteps", () => {
  it("splits numbered and bulleted lines and drops the markers", () => {
    expect(instructionSteps("1. Create a table.\n2) Insert rows.\n\n- Run `SELECT 1`.")).toEqual([
      "Create a table.",
      "Insert rows.",
      "Run `SELECT 1`.",
    ]);
  });
});

describe("timeLeftLabel", () => {
  const now = new Date("2026-10-28T12:00:00Z");
  const inMinutes = (minutes: number) => new Date(now.getTime() + minutes * 60_000);

  it("counts down in minutes, hours, then days", () => {
    expect(timeLeftLabel(inMinutes(40), now)).toBe("40 min left");
    expect(timeLeftLabel(inMinutes(5 * 60 + 30), now)).toBe("5 h left");
    expect(timeLeftLabel(inMinutes(47 * 60), now)).toBe("47 h left");
    expect(timeLeftLabel(inMinutes(6 * 24 * 60 + 60), now)).toBe("6 days left");
  });

  it("says nothing once it's due, or without a due time", () => {
    expect(timeLeftLabel(inMinutes(0), now)).toBeNull();
    expect(timeLeftLabel(inMinutes(-90), now)).toBeNull();
    expect(timeLeftLabel(null, now)).toBeNull();
  });
});

describe("tallyLabel", () => {
  it("leads with what was handed in and names only what went wrong", () => {
    expect(tallyLabel({ given: 7, handedIn: 5, missed: 2, skipped: 0 })).toBe("5 of 7 handed in, 2 missed");
    expect(tallyLabel({ given: 6, handedIn: 4, missed: 1, skipped: 1 })).toBe(
      "4 of 6 handed in, 1 missed, 1 skipped",
    );
    expect(tallyLabel({ given: 3, handedIn: 3, missed: 0, skipped: 0 })).toBe("3 of 3 handed in");
  });

  it("says nothing before any mission was given", () => {
    expect(tallyLabel({ given: 0, handedIn: 0, missed: 0, skipped: 0 })).toBeNull();
  });
});
