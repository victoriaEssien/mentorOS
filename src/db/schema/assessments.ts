import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { assessmentItemType, assessmentKind, createdAt, id } from "./_shared";
import { user } from "./auth";

/**
 * A diagnostic, knowledge check, surprise check or reassessment (PRD §9, §18).
 * The PRD's separate Quiz entity is folded in here via `kind`; split it out if quizzes diverge.
 */
export const assessment = pgTable(
  "assessment",
  {
    id: id(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: assessmentKind().notNull(),
    title: text().notNull(),
    /** Skill ids this assessment targets. */
    targetSkillIds: jsonb().$type<string[]>().default([]).notNull(),
    /** Why the system scheduled this (shown to the learner). */
    reason: text(),
    /** Model id that generated the items, for auditability. */
    generatedBy: text(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.userId, t.kind)],
);

export const assessmentItem = pgTable(
  "assessment_item",
  {
    id: id(),
    assessmentId: uuid()
      .notNull()
      .references(() => assessment.id, { onDelete: "cascade" }),
    type: assessmentItemType().notNull(),
    order: integer().notNull(),
    /** Prompt payload: question text, code snippet, options, dataset ref, etc. */
    prompt: jsonb().notNull(),
    /** Grading rubric / expected answer. Never sent to the client before submission. */
    rubric: jsonb().notNull(),
    skillIds: jsonb().$type<string[]>().default([]).notNull(),
    /** 1 (recall) .. 5 (transfer to an unseen problem). */
    difficulty: integer().notNull(),
    timeLimitSeconds: integer(),
  },
  (t) => [index().on(t.assessmentId)],
);

export const assessmentAttempt = pgTable(
  "assessment_attempt",
  {
    id: id(),
    assessmentId: uuid()
      .notNull()
      .references(() => assessment.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    startedAt: createdAt(),
    completedAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    index().on(t.userId),
    // At most one attempt in progress per learner and assessment, so racing autosaves share it.
    uniqueIndex("assessment_attempt_open_index")
      .on(t.assessmentId, t.userId)
      .where(sql`${t.completedAt} is null`),
  ],
);

export const assessmentResponse = pgTable(
  "assessment_response",
  {
    id: id(),
    attemptId: uuid()
      .notNull()
      .references(() => assessmentAttempt.id, { onDelete: "cascade" }),
    itemId: uuid()
      .notNull()
      .references(() => assessmentItem.id, { onDelete: "cascade" }),
    /** Null when the learner asked for a hint on the question but hasn't answered it yet. */
    response: jsonb(),
    score: real(),
    /** Hints the mentor gave during this item. Affects how much the score counts. */
    hintsUsed: integer().default(0).notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex().on(t.attemptId, t.itemId)],
);
