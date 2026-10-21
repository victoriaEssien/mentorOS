import { describe, expect, it } from "vitest";

import { nextAction } from "./today";

const settled = {
  openDiagnostic: null,
  hasPath: true,
  pathOnItsWay: false,
  openSurprise: null,
  daily: null,
  openChecks: [],
};

describe("nextAction", () => {
  it("puts the diagnostic first, since everything else starts from it", () => {
    expect(
      nextAction({ ...settled, openDiagnostic: "diagnostic", openSurprise: "surprise", daily: "mission" }),
    ).toEqual({ kind: "diagnostic", assessment: "diagnostic" });
  });

  it("waits for a path that's being planned, or asks for one", () => {
    expect(nextAction({ ...settled, hasPath: false, pathOnItsWay: true })).toEqual({
      kind: "path-on-its-way",
    });
    expect(nextAction({ ...settled, hasPath: false })).toEqual({ kind: "plan-path" });
  });

  it("takes a surprise check before the day's mission", () => {
    expect(nextAction({ ...settled, openSurprise: "surprise", daily: "mission" })).toEqual({
      kind: "surprise",
      assessment: "surprise",
    });
  });

  it("keeps today's mission ahead of a check they started", () => {
    expect(nextAction({ ...settled, daily: "mission", openChecks: ["check"] })).toEqual({
      kind: "mission",
      mission: "mission",
    });
    expect(nextAction({ ...settled, openChecks: ["check", "later"] })).toEqual({
      kind: "check",
      assessment: "check",
    });
  });

  it("offers new work only when nothing is open", () => {
    expect(nextAction(settled)).toEqual({ kind: "get-mission" });
  });
});
