import { describe, expect, it } from "vitest";

import type { LearningPlan } from "../schemas";
import { MAX_PATH_ITEMS, sanitizePlan } from "./learning-plan-sanitize";

const names = new Map([
  ["http", "HTTP"],
  ["sql", "SQL"],
  ["transactions", "Transactions"],
  ["apis", "APIs"],
]);
const blocked = new Map([["indexing", ["sql", "transactions"]]]);

const item = (skill: string | null, title = `Learn ${skill}`) => ({
  skill,
  title,
  reason: "Because evidence.",
});
const plan = (items: LearningPlan["items"], deferred: LearningPlan["deferred"] = []): LearningPlan => ({
  focusSummary: "  Start with HTTP.  ",
  items,
  deferred,
});

describe("sanitizePlan", () => {
  it("keeps valid items in order and trims text", () => {
    const result = sanitizePlan(plan([item("http"), item("SQL ")]), names, blocked);
    expect(result.focusSummary).toBe("Start with HTTP.");
    expect(result.items.map((i) => i.skill)).toEqual(["http", "sql"]);
    expect(result.dropped).toBe(0);
  });

  it("moves a blocked skill to not yet, naming what it waits on", () => {
    const result = sanitizePlan(plan([item("http"), item("indexing", "Indexes")]), names, blocked);
    expect(result.items.map((i) => i.skill)).toEqual(["http"]);
    expect(result.deferred).toEqual([
      {
        skill: "indexing",
        title: "Indexes",
        reason: "Not yet: it builds on SQL and Transactions, and I haven't seen enough of that from you.",
        unlockWhen: "When SQL and Transactions are at intermediate, with enough evidence to trust it.",
      },
    ]);
  });

  it("drops unknown skills, repeats, blank items and a second capstone", () => {
    const result = sanitizePlan(
      plan([
        item("http"),
        item("kubernetes"),
        item("http", "HTTP again"),
        { skill: "sql", title: " ", reason: "x" },
        item(null, "Build a secure API"),
        item(null, "Build a second thing"),
      ]),
      names,
      blocked,
    );
    expect(result.items.map((i) => i.title)).toEqual(["Learn http", "Build a secure API"]);
    expect(result.dropped).toBe(4);
  });

  it("never lets a capstone be the current focus", () => {
    const result = sanitizePlan(plan([item(null, "Build a secure API"), item("http")]), names, blocked);
    expect(result.items.map((i) => i.skill)).toEqual(["http", null]);
  });

  it("caps the path length", () => {
    const many = ["http", "sql", "transactions", "apis"].flatMap((s) => [item(s)]);
    const extra = new Map([...names, ...["a", "b", "c", "d"].map((s) => [s, s.toUpperCase()] as const)]);
    const result = sanitizePlan(plan([...many, ...["a", "b", "c", "d"].map((s) => item(s))]), extra, blocked);
    expect(result.items).toHaveLength(MAX_PATH_ITEMS);
    expect(result.dropped).toBe(2);
  });

  it("keeps the model's own deferrals, unless code already deferred that skill", () => {
    const result = sanitizePlan(
      plan(
        [item("http"), item("indexing")],
        [
          {
            request: "Kubernetes",
            skill: "kubernetes",
            reason: "Containers first.",
            unlockWhen: "Containers at intermediate.",
          },
          { request: "Indexes", skill: "indexing", reason: "Duplicate.", unlockWhen: "Later." },
        ],
      ),
      names,
      blocked,
    );
    expect(result.deferred.map((d) => [d.title, d.skill])).toEqual([
      ["Learn indexing", "indexing"],
      ["Kubernetes", null],
    ]);
  });
});
