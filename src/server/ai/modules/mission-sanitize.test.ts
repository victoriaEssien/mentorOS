import { describe, expect, it } from "vitest";

import type { GeneratedMission } from "../schemas";
import { sanitizeMission } from "./mission-sanitize";

const base: GeneratedMission = {
  type: "build",
  title: "  Guard a stock update  ",
  objective: "Show an UPDATE that can't oversell.",
  scenario: "  A flash sale oversold 40 units last week.  ",
  technology: "PostgreSQL",
  reason: "Your answer showed the gap.",
  estimatedMinutes: 45,
  durationWeeks: 1,
  requiredKnowledge: ["UPDATE syntax", " "],
  instructions: "1. Create a table.\n2. Write the update.",
  deliverable: "A gist with the SQL and a short explanation.",
  acceptanceCriteria: [
    "Stock never goes below zero",
    "  ",
    " Two concurrent buyers can't both win the last unit ",
  ],
  stretchGoal: "  ",
  evaluationCriteria: [
    { key: "Correctness", label: "Correctness", description: "Never oversells.", maxScore: 25 },
    { key: "correctness", label: "Explanation", description: "Says why it works.", maxScore: 10 },
    { key: "", label: "  ", description: "blank label", maxScore: 10 },
  ],
  resources: [
    {
      title: "PostgreSQL UPDATE",
      url: "https://www.postgresql.org/docs/current/sql-update.html",
      kind: "docs",
      note: null,
    },
    { title: "Sketchy", url: "javascript:alert(1)", kind: "", note: "  " },
  ],
};

describe("sanitizeMission", () => {
  it("scores every criterion out of 10 with unique keys, dropping blank ones", () => {
    const mission = sanitizeMission(base);
    expect(mission.evaluationCriteria).toEqual([
      { key: "correctness", label: "Correctness", description: "Never oversells.", maxScore: 10 },
      { key: "correctness-2", label: "Explanation", description: "Says why it works.", maxScore: 10 },
    ]);
  });

  it("keeps a project to 1 to 4 weeks, with effort that fits", () => {
    expect(sanitizeMission({ ...base, durationWeeks: 9 }).durationWeeks).toBe(4);
    expect(sanitizeMission({ ...base, durationWeeks: 0 }).durationWeeks).toBe(1);
    expect(sanitizeMission({ ...base, durationWeeks: 1, estimatedMinutes: 5000 }).estimatedMinutes).toBe(900);
    expect(sanitizeMission({ ...base, durationWeeks: 2, estimatedMinutes: 5 }).estimatedMinutes).toBe(60);
  });

  it("keeps only web links and trims text", () => {
    const mission = sanitizeMission(base);
    expect(mission.title).toBe("Guard a stock update");
    expect(mission.requiredKnowledge).toEqual(["UPDATE syntax"]);
    expect(mission.resources).toEqual([
      {
        title: "PostgreSQL UPDATE",
        url: "https://www.postgresql.org/docs/current/sql-update.html",
        kind: "docs",
        note: null,
      },
      { title: "Sketchy", url: null, kind: "docs", note: null },
    ]);
  });

  it("trims the scenario and done-when list, and treats a blank stretch goal as none", () => {
    const mission = sanitizeMission(base);
    expect(mission.scenario).toBe("A flash sale oversold 40 units last week.");
    expect(mission.acceptanceCriteria).toEqual([
      "Stock never goes below zero",
      "Two concurrent buyers can't both win the last unit",
    ]);
    expect(mission.stretchGoal).toBeNull();
  });
});
