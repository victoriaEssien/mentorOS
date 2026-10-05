import { integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { createdAt, updatedAt } from "./_shared";
import { user } from "./auth";
import { track } from "./skills";

/**
 * Onboarding context (PRD §8). This supplements assessment evidence; it never sets skill levels.
 */
export const learnerProfile = pgTable("learner_profile", {
  userId: text()
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  goals: jsonb().$type<string[]>().default([]).notNull(),
  customGoal: text(),
  currentRole: text(),
  yearsExperience: integer(),
  technologiesUsed: jsonb().$type<string[]>().default([]).notNull(),
  previousLearning: text(),
  weeklyLearningHours: integer(),
  learningStyle: text(),
  existingProjects: text(),
  onboardingCompletedAt: timestamp({ withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Tracks a learner has selected. Multiple allowed (PRD §4). */
export const userTrack = pgTable(
  "user_track",
  {
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    trackId: uuid()
      .notNull()
      .references(() => track.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.trackId] })],
);
