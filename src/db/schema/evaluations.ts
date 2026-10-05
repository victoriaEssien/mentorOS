import { index, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { createdAt, evaluationOutcome, id } from "./_shared";
import { assessmentAttempt } from "./assessments";
import { user } from "./auth";
import { missionSubmission } from "./learning";

/**
 * AI-generated evaluation of a submission or assessment attempt (PRD §16, §25).
 * `result` holds the validated structured output; skill_evidence rows are derived from it.
 */
export const evaluation = pgTable(
  "evaluation",
  {
    id: id(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    submissionId: uuid().references(() => missionSubmission.id, { onDelete: "cascade" }),
    attemptId: uuid().references(() => assessmentAttempt.id, { onDelete: "cascade" }),
    outcome: evaluationOutcome().notNull(),
    result: jsonb().notNull(),
    model: text().notNull(),
    promptVersion: text().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.userId), index().on(t.submissionId), index().on(t.attemptId)],
);
