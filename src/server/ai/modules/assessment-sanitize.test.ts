import { describe, expect, it } from "vitest";

import type { GeneratedAssessmentItem } from "../schemas";
import { sanitizeAssessmentItems } from "./assessment-sanitize";

const item = (overrides: Partial<GeneratedAssessmentItem> = {}): GeneratedAssessmentItem => ({
  type: "knowledge",
  skills: ["http"],
  difficulty: 2,
  prompt: {
    question: "Which status code means not found?",
    code: null,
    options: ["200", "301", "404", "500"],
  },
  rubric: { expected: "404", gradingNotes: "Only 404 is correct.", correctOption: 2 },
  timeLimitSeconds: null,
  ...overrides,
});

const allowed = new Set(["http", "sql"]);

describe("sanitizeAssessmentItems", () => {
  it("keeps a valid multiple-choice item as it is", () => {
    const { items, dropped } = sanitizeAssessmentItems([item()], allowed);
    expect(dropped).toBe(0);
    expect(items[0]).toEqual(item());
  });

  it("drops skills outside the allowed list, and items left with none", () => {
    const { items, dropped } = sanitizeAssessmentItems(
      [item({ skills: ["http", "kubernetes"] }), item({ skills: ["kubernetes"] })],
      allowed,
    );
    expect(dropped).toBe(1);
    expect(items[0].skills).toEqual(["http"]);
  });

  it("normalises skill slugs and removes repeats", () => {
    const { items } = sanitizeAssessmentItems([item({ skills: [" HTTP", "http", "Sql"] })], allowed);
    expect(items[0].skills).toEqual(["http", "sql"]);
  });

  it("turns a multiple-choice item with a broken answer key into an open question", () => {
    const outOfRange = sanitizeAssessmentItems(
      [item({ rubric: { expected: "x", gradingNotes: "y", correctOption: 7 } })],
      allowed,
    );
    expect(outOfRange.items[0].prompt.options).toBeNull();
    expect(outOfRange.items[0].rubric.correctOption).toBeNull();

    const missingKey = sanitizeAssessmentItems(
      [item({ rubric: { expected: "x", gradingNotes: "y", correctOption: null } })],
      allowed,
    );
    expect(missingKey.items[0].prompt.options).toBeNull();
  });

  it("clears a stray answer key on an open item", () => {
    const { items } = sanitizeAssessmentItems(
      [item({ prompt: { question: "Explain caching.", code: null, options: null } })],
      allowed,
    );
    expect(items[0].rubric.correctOption).toBeNull();
  });

  it("clamps difficulty and drops empty questions", () => {
    const { items, dropped } = sanitizeAssessmentItems(
      [item({ difficulty: 9 }), item({ prompt: { question: "  ", code: null, options: null } })],
      allowed,
    );
    expect(items[0].difficulty).toBe(5);
    expect(dropped).toBe(1);
  });
});
