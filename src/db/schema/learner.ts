import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { createdAt, mentorTone, updatedAt } from "./_shared";
import { user } from "./auth";

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
  mentorTone: mentorTone().default("balanced").notNull(),
  existingProjects: text(),
  onboardingCompletedAt: timestamp({ withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
