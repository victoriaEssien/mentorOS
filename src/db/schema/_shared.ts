import { pgEnum, timestamp, uuid } from "drizzle-orm/pg-core";

export const id = () => uuid().primaryKey().defaultRandom();

export const createdAt = () => timestamp({ withTimezone: true }).defaultNow().notNull();

export const updatedAt = () =>
  timestamp({ withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull();

/** Mission activity types (PRD §14). */
export const missionType = pgEnum("mission_type", [
  "learn",
  "practice",
  "build",
  "debug",
  "explain",
  "analyze",
  "design",
  "research",
  "teach",
  "challenge",
]);

/** Projects are "weekly"; "daily" is left from the old daily missions, which no longer exist. */
export const missionCadence = pgEnum("mission_cadence", ["daily", "weekly"]);

/** `expired`: not handed in by its due time. Recorded, never scored. */
export const missionStatus = pgEnum("mission_status", [
  "assigned",
  "in_progress",
  "submitted",
  "evaluated",
  "skipped",
  "expired",
]);

/** Overall verdict on a project review. */
export const evaluationOutcome = pgEnum("evaluation_outcome", ["strong", "pass", "partial", "fail"]);

export const mentorRole = pgEnum("mentor_role", ["user", "assistant", "system"]);

/**
 * How the mentor delivers feedback (PRODUCT.md: "tone adapts, standards don't"). The learner picks
 * one; the system also shifts delivery with momentum. Scores and verdicts never change with tone.
 */
export const mentorTone = pgEnum("mentor_tone", ["direct", "balanced", "supportive"]);

/** A concept explanation's verdict: plain words, no score. */
export const conceptVerdict = pgEnum("concept_verdict", ["solid", "partly", "not_yet"]);

/** Whether an attempt is the day's new concept or a spaced review of an earlier one. */
export const attemptKind = pgEnum("attempt_kind", ["new", "review"]);
