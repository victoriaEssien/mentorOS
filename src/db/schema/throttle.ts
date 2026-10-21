import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Fixed-window counters for actions that need a ceiling, such as how many account emails one
 * person can set off in an hour. In Postgres because a serverless instance's memory is gone after
 * the request. The key names the action and whose it is: `email:confirm:<user id>`.
 */
export const throttle = pgTable("throttle", {
  key: text().primaryKey(),
  windowStart: timestamp({ withTimezone: true }).defaultNow().notNull(),
  hits: integer().default(1).notNull(),
});
