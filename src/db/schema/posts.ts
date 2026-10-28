import { date, index, jsonb, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { createdAt, id, updatedAt } from "./_shared";
import { assessment } from "./assessments";
import { user } from "./auth";

/**
 * What the learner noted after a daily coding set: what they learned and what they got wrong. Their
 * own words, kept for the weekly post. Never evidence: it doesn't move an estimate.
 */
export const learningNote = pgTable(
  "learning_note",
  {
    id: id(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    assessmentId: uuid()
      .notNull()
      .references(() => assessment.id, { onDelete: "cascade" }),
    learned: text().notNull(),
    gotWrong: text().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex().on(t.userId, t.assessmentId)],
);

/**
 * A post about the learner's week, drafted for LinkedIn and X from what the week's evidence shows
 * (Part E). One per learner per week, rewritten in place when they ask for another draft.
 */
export const weeklyPost = pgTable(
  "weekly_post",
  {
    id: id(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** The Monday the week starts on, "YYYY-MM-DD". */
    weekStart: date({ mode: "string" }).notNull(),
    linkedin: text().notNull(),
    x: text().notNull(),
    /** What the draft drew on, in a few words each, so the learner can see it's grounded. */
    drewOn: jsonb().$type<string[]>().default([]).notNull(),
    generatedBy: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex().on(t.userId, t.weekStart), index().on(t.weekStart)],
);
