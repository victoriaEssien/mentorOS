import {
  type AnyPgColumn,
  index,
  integer,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { createdAt, evidenceSourceType, id, updatedAt } from "./_shared";
import { user } from "./auth";

/** A learning discipline, e.g. Software Engineering (PRD §4). */
export const track = pgTable("track", {
  id: id(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  description: text(),
  sortOrder: integer().default(0).notNull(),
  createdAt: createdAt(),
});

/**
 * A capability, independent of any course (PRD §11).
 * `trackId` and `parentId` are the skill's home. Top-level skills (no parent) are groups that
 * organise a track's tree; leaf skills are what assessments and missions actually measure.
 * A skill can appear in other tracks too, through skill_placement.
 */
export const skill = pgTable(
  "skill",
  {
    id: id(),
    slug: text().notNull().unique(),
    name: text().notNull(),
    description: text(),
    trackId: uuid().references(() => track.id, { onDelete: "set null" }),
    parentId: uuid().references((): AnyPgColumn => skill.id, { onDelete: "set null" }),
    sortOrder: integer().default(0).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.trackId), index().on(t.parentId)],
);

/**
 * Where a skill sits in each track's tree (PRD §11: "the same skill can appear across different
 * learning paths"). SQL lives under Databases in Software Engineering and under Querying in Data
 * Analysis: one skill, one evidence history, two placements. Includes the home placement.
 */
export const skillPlacement = pgTable(
  "skill_placement",
  {
    trackId: uuid()
      .notNull()
      .references(() => track.id, { onDelete: "cascade" }),
    skillId: uuid()
      .notNull()
      .references(() => skill.id, { onDelete: "cascade" }),
    /** The group this skill sits under in this track; null for the track's groups themselves. */
    parentId: uuid().references(() => skill.id, { onDelete: "cascade" }),
    sortOrder: integer().default(0).notNull(),
  },
  (t) => [primaryKey({ columns: [t.trackId, t.skillId] }), index().on(t.skillId)],
);

/**
 * Skill prerequisites, so the planner can say "not yet" (e.g. Kubernetes requires Containers, Networking).
 */
export const skillPrerequisite = pgTable(
  "skill_prerequisite",
  {
    skillId: uuid()
      .notNull()
      .references(() => skill.id, { onDelete: "cascade" }),
    requiresSkillId: uuid()
      .notNull()
      .references(() => skill.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.skillId, t.requiresSkillId] })],
);

/**
 * The source of truth for what a learner can do (PRD §33).
 * Append-only. Every row is one observation; nothing here is ever overwritten.
 */
export const skillEvidence = pgTable(
  "skill_evidence",
  {
    id: id(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    skillId: uuid()
      .notNull()
      .references(() => skill.id, { onDelete: "cascade" }),
    sourceType: evidenceSourceType().notNull(),
    /** Id of the assessment attempt, mission submission, etc. that produced this evidence. */
    sourceId: uuid(),
    /** 0..1 demonstrated ability on this observation. */
    score: real().notNull(),
    /** 0..1 how much this observation should move the estimate. */
    confidence: real().notNull(),
    evidenceSummary: text().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.userId, t.skillId, t.createdAt)],
);

/**
 * Derived snapshot of a learner's current estimate per skill (PRD §10, §28).
 * Recomputed from skill_evidence by deterministic code, never written directly by the LLM.
 */
export const userSkill = pgTable(
  "user_skill",
  {
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    skillId: uuid()
      .notNull()
      .references(() => skill.id, { onDelete: "cascade" }),
    ability: real().notNull(),
    confidence: real().notNull(),
    evidenceCount: integer().default(0).notNull(),
    /** When the newest evidence for this skill arrived. Drives retention checks. */
    lastEvidenceAt: timestamp({ withTimezone: true }),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.skillId] })],
);
