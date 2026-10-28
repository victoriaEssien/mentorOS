import { pgEnum, timestamp, uuid } from "drizzle-orm/pg-core";

export const id = () => uuid().primaryKey().defaultRandom();

export const createdAt = () => timestamp({ withTimezone: true }).defaultNow().notNull();

export const updatedAt = () =>
  timestamp({ withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull();

/** Where a piece of skill evidence came from (PRD §33). */
export const evidenceSourceType = pgEnum("evidence_source_type", [
  "assessment",
  "quiz",
  "mission",
  "project",
  "manual",
  "reflection",
]);

/** Assessment item formats (PRD §9). */
export const assessmentItemType = pgEnum("assessment_item_type", [
  "knowledge",
  "conceptual",
  "code",
  "debugging",
  "scenario",
  "problem_solving",
  "practical",
  "security",
  "data",
  "electronics",
]);

/** Why an assessment exists. Quizzes and surprise checks live here too (PRD §9, §18). */
export const assessmentKind = pgEnum("assessment_kind", [
  "diagnostic",
  "knowledge_check",
  "surprise",
  "reassessment",
]);

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

export const pathItemStatus = pgEnum("path_item_status", ["upcoming", "current", "completed", "deferred"]);

/** Overall verdict on a piece of evidence (PRD §16, §25). */
export const evaluationOutcome = pgEnum("evaluation_outcome", ["strong", "pass", "partial", "fail"]);

export const mentorRole = pgEnum("mentor_role", ["user", "assistant", "system"]);

/**
 * How the mentor delivers feedback (PRODUCT.md: "tone adapts, standards don't"). The learner picks
 * one; the system also shifts delivery with momentum. Scores and verdicts never change with tone.
 */
export const mentorTone = pgEnum("mentor_tone", ["direct", "balanced", "supportive"]);
