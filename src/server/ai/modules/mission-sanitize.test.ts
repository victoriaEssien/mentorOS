import { describe, expect, it } from "vitest";

import type { GeneratedMission } from "../schemas";
import { MINUTES, sanitizeMission } from "./mission-sanitize";

const base: GeneratedMission = {
  type: "build",
  title: "  Guard a stock update  ",
  objective: "Show an UPDATE that can't oversell.",
  reason: "Your answer showed the gap.",
  estimatedMinutes: 45,
  skills: ["SQL", "transactions", "kubernetes"],
  requiredKnowledge: ["UPDATE syntax", " "],
  instructions: "1. Create a table.\n2. Write the update.",
  deliverable: "A gist with the SQL and a short explanation.",
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

const allowed = new Set(["sql", "transactions", "indexing"]);

describe("sanitizeMission", () => {
  it("keeps allowed skills, focus skill first, without repeats", () => {
    const mission = sanitizeMission(base, {
      cadence: "daily",
      focusSkill: "transactions",
      allowedSkills: allowed,
    });
    expect(mission.skills).toEqual(["transactions", "sql"]);
  });

  it("scores every criterion out of 10 with unique keys, dropping blank ones", () => {
    const mission = sanitizeMission(base, { cadence: "daily", focusSkill: "sql", allowedSkills: allowed });
    expect(mission.evaluationCriteria).toEqual([
      { key: "correctness", label: "Correctness", description: "Never oversells.", maxScore: 10 },
      { key: "correctness-2", label: "Explanation", description: "Says why it works.", maxScore: 10 },
    ]);
  });

  it("fits the time to the cadence", () => {
    const short = sanitizeMission(
      { ...base, estimatedMinutes: 5 },
      { cadence: "daily", focusSkill: null, allowedSkills: allowed },
    );
    const long = sanitizeMission(
      { ...base, estimatedMinutes: 900 },
      { cadence: "weekly", focusSkill: null, allowedSkills: allowed },
    );
    expect(short.estimatedMinutes).toBe(MINUTES.daily.min);
    expect(long.estimatedMinutes).toBe(MINUTES.weekly.max);
  });

  it("keeps only web links and trims text", () => {
    const mission = sanitizeMission(base, { cadence: "daily", focusSkill: "sql", allowedSkills: allowed });
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
});
