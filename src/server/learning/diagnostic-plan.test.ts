import { describe, expect, it } from "vitest";

import { pickDiagnosticSkills, planDiagnosticChunks, type CandidateSkill } from "./diagnostic-plan";

const skill = (slug: string, trackId: string, parentId: string, home = true): CandidateSkill => ({
  slug,
  name: slug,
  description: null,
  trackId,
  parentId,
  home,
});

const candidates = [
  skill("vars", "se", "programming"),
  skill("functions", "se", "programming"),
  skill("errors", "se", "programming"),
  skill("async", "se", "programming"),
  skill("http", "se", "web"),
  skill("apis", "se", "web"),
  skill("sql", "se", "db"),
  skill("spreadsheets", "data", "fundamentals"),
  skill("cleaning", "data", "fundamentals"),
  skill("stats", "data", "fundamentals"),
];

describe("pickDiagnosticSkills", () => {
  it("takes every group's fundamental skill first", () => {
    expect(pickDiagnosticSkills(candidates, 4).map((s) => s.slug)).toEqual([
      "vars",
      "http",
      "sql",
      "spreadsheets",
    ]);
  });

  it("then the deepest skill in each group", () => {
    expect(pickDiagnosticSkills(candidates, 7).map((s) => s.slug)).toEqual([
      "vars",
      "http",
      "sql",
      "spreadsheets",
      "async",
      "apis",
      "stats",
    ]);
  });

  it("never repeats a skill placed in two tracks", () => {
    const shared = [...candidates, skill("sql", "data", "querying")];
    const slugs = pickDiagnosticSkills(shared, 20).map((s) => s.slug);
    expect(slugs.filter((slug) => slug === "sql")).toHaveLength(1);
  });

  it("stops at the cap and copes with fewer candidates than the cap", () => {
    expect(pickDiagnosticSkills(candidates, 3)).toHaveLength(3);
    expect(pickDiagnosticSkills(candidates, 50)).toHaveLength(candidates.length);
    expect(pickDiagnosticSkills([], 10)).toEqual([]);
  });
});

describe("pickDiagnosticSkills with borrowed skills", () => {
  it("probes a group's own skills before skills borrowed from other tracks", () => {
    const group = [
      skill("vars", "se", "programming"),
      skill("functions", "se", "programming"),
      skill("async", "se", "programming"),
      skill("algorithms", "se", "programming", false),
    ];
    expect(pickDiagnosticSkills(group, 3).map((s) => s.slug)).toEqual(["vars", "async", "functions"]);
  });
});

describe("planDiagnosticChunks", () => {
  it("splits into parallel chunks with a little more than one item per skill", () => {
    const chunks = planDiagnosticChunks(["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"]);
    expect(chunks.map((chunk) => chunk.skills.length)).toEqual([4, 4, 2]);
    expect(chunks.map((chunk) => chunk.itemCount)).toEqual([5, 5, 3]);
  });
});
