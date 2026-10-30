import { index, jsonb, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { createdAt, evaluationOutcome, id } from "./_shared";
import { user } from "./auth";
import { missionSubmission } from "./learning";

/** The review of a project hand-in. `result` holds the validated structured output. */
export const evaluation = pgTable(
  "evaluation",
  {
    id: id(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    submissionId: uuid().references(() => missionSubmission.id, { onDelete: "cascade" }),
    outcome: evaluationOutcome().notNull(),
    result: jsonb().notNull(),
    model: text().notNull(),
    promptVersion: text().notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index().on(t.userId),
    // One review per submission: a second hand-in of the same submission fails its write.
    uniqueIndex().on(t.submissionId),
  ],
);
