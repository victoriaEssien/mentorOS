import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { updatedAt } from "./_shared";
import { user } from "./auth";

/**
 * A learner's choices about the emails that aren't about their account (weekly progress and
 * reminders), plus what the daily job last sent them, so it never sends twice. A missing row means
 * the defaults: both on, nothing sent yet. Account emails (confirming an address, resetting a
 * password) can't be switched off and aren't recorded here; their hourly cap lives in throttle.
 */
export const emailSettings = pgTable("email_settings", {
  userId: text()
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  weeklyProgress: boolean().default(true).notNull(),
  reminders: boolean().default(true).notNull(),
  lastWeeklyAt: timestamp({ withTimezone: true }),
  lastReminderAt: timestamp({ withTimezone: true }),
  /** Reminders sent since they last came back. The job stops at two, so silence is respected. */
  remindersUnanswered: integer().default(0).notNull(),
  updatedAt: updatedAt(),
});
