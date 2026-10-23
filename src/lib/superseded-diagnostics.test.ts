import { describe, expect, it } from "vitest";

import { withoutSupersededDiagnostics } from "./superseded-diagnostics";

const done = new Date("2026-10-23T12:18:16Z");

describe("withoutSupersededDiagnostics", () => {
  it("drops a diagnostic nobody started once another was finished", () => {
    const rows = [
      { id: "second", kind: "diagnostic", completedAt: null },
      { id: "first", kind: "diagnostic", completedAt: done },
      { id: "check", kind: "knowledge_check", completedAt: null },
    ];
    expect(withoutSupersededDiagnostics(rows).map((row) => row.id)).toEqual(["first", "check"]);
  });

  it("keeps the open diagnostic while none is finished", () => {
    const rows = [{ id: "only", kind: "diagnostic", completedAt: null }];
    expect(withoutSupersededDiagnostics(rows)).toEqual(rows);
  });

  it("never drops other unfinished assessments", () => {
    const rows = [
      { id: "diag", kind: "diagnostic", completedAt: done },
      { id: "surprise", kind: "surprise", completedAt: null },
    ];
    expect(withoutSupersededDiagnostics(rows)).toEqual(rows);
  });
});
