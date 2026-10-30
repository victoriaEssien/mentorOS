import {
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { attemptKind, conceptVerdict, createdAt, id, updatedAt } from "./_shared";
import { user } from "./auth";
import { mission } from "./learning";

/** One key point a good explanation of a concept covers. */
export type ChecklistPoint = { id: string; point: string };

/** How an explanation did against the checklist, point by point. */
export type ConceptGrading = {
  points: { id: string; status: "hit" | "missed" | "wrong"; note: string }[];
  /** Two or three sentences on the biggest gap, as "you". */
  feedback: string;
};

/** The short check on a follow-up answer. */
export type FollowUpCheck = { result: "right" | "partly" | "wrong"; note: string };

/**
 * A theme the learner is on or has been through: the app picks the next one in order when the last
 * ends. Each runs one or two weeks and comes with one project.
 */
export const themeRun = pgTable(
  "theme_run",
  {
    id: id(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** From src/lib/themes.ts. */
    themeSlug: text().notNull(),
    startsOn: date({ mode: "string" }).notNull(),
    /** The day after the last day of the theme. */
    endsOn: date({ mode: "string" }).notNull(),
    missionId: uuid().references(() => mission.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex().on(t.userId, t.startsOn), index().on(t.userId, t.endsOn)],
);

/**
 * A concept as the app teaches it, written once the first time it's handed out and then fixed: what
 * to explain, the checklist explanations are graded against (so grading stays consistent across
 * reviews), a reference explanation to compare with, and official docs for high-stakes themes.
 */
export const concept = pgTable("concept", {
  /** From src/lib/themes.ts. */
  slug: text().primaryKey(),
  themeSlug: text().notNull(),
  title: text().notNull(),
  ask: text().notNull(),
  checklist: jsonb().$type<ChecklistPoint[]>().notNull(),
  reference: text().notNull(),
  sources: jsonb().$type<{ title: string; url: string }[]>().default([]).notNull(),
  generatedBy: text(),
  createdAt: createdAt(),
});

/**
 * One go at a concept on one day: the day's new concept or a spaced review of an earlier one. Holds
 * the question asked (reviews ask in a fresh way), the learner's explanation, the grading against
 * the checklist, the verdict, and the follow-up with its answer and check. This is the history.
 */
export const conceptAttempt = pgTable(
  "concept_attempt",
  {
    id: id(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** From src/lib/themes.ts; the concept row is written when it's first opened. */
    conceptSlug: text().notNull(),
    day: date({ mode: "string" }).notNull(),
    kind: attemptKind().notNull(),
    /** What they're asked: the concept's ask for a new one, a fresh scenario for a review. */
    question: text(),
    explanation: text(),
    grading: jsonb().$type<ConceptGrading>(),
    verdict: conceptVerdict(),
    followUp: text(),
    followUpAnswer: text(),
    followUpCheck: jsonb().$type<FollowUpCheck>(),
    /** Model and prompt versions that wrote the question and graded it. */
    gradedBy: text(),
    explainedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex().on(t.userId, t.conceptSlug, t.day), index().on(t.userId, t.day)],
);

/**
 * When each concept comes back. A solid explanation pushes it out (3, 7, 14, then 30 days), partly
 * there brings it back in a day or two, not yet brings it back the next day.
 */
export const conceptSchedule = pgTable(
  "concept_schedule",
  {
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** From src/lib/themes.ts; the concept row is written when it's first opened. */
    conceptSlug: text().notNull(),
    introducedOn: date({ mode: "string" }).notNull(),
    nextReviewOn: date({ mode: "string" }).notNull(),
    intervalDays: integer().notNull(),
    /** How far up the solid ladder it is: 0 until it's been solid, then 1 (3 days) to 4 (30). */
    step: integer().default(0).notNull(),
    lastVerdict: conceptVerdict(),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.conceptSlug] }), index().on(t.userId, t.nextReviewOn)],
);
