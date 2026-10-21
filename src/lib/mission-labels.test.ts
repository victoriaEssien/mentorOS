import { describe, expect, it } from "vitest";

import { durationLabel, instructionSteps } from "./mission-labels";

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
