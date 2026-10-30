import { jsonb, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { createdAt, id, updatedAt } from "./_shared";
import { user } from "./auth";
import { mission } from "./learning";

/**
 * A project's posts for X and LinkedIn, drafted after its review from what was built and what was
 * hard. One per project, rewritten in place when the learner asks for another draft.
 */
export const projectPost = pgTable(
  "project_post",
  {
    id: id(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    missionId: uuid()
      .notNull()
      .references(() => mission.id, { onDelete: "cascade" }),
    linkedin: text().notNull(),
    x: text().notNull(),
    /** What the draft drew on, a few words each, so the learner can see it's grounded. */
    drewOn: jsonb().$type<string[]>().default([]).notNull(),
    generatedBy: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex().on(t.missionId)],
);
