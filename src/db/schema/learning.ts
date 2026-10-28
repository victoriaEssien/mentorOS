import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import {
  createdAt,
  id,
  missionCadence,
  missionStatus,
  missionType,
  pathItemStatus,
  updatedAt,
} from "./_shared";
import { user } from "./auth";
import { skill } from "./skills";

/**
 * How to study one path step: the ideas to understand, what to read, small exercises before the
 * mission, the usual mistakes, and how to tell it has landed. Written when the step is first
 * opened as the current one.
 */
export type StudyGuide = {
  summary: string;
  learn: { idea: string; why: string }[];
  read: { title: string; url?: string; kind: string; note?: string }[];
  practise: string[];
  pitfalls: string[];
  checkpoints: string[];
};

/** A learner's personalised path (PRD §12). Old paths are archived, not edited, so changes are traceable. */
export const learningPath = pgTable(
  "learning_path",
  {
    id: id(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    focusSummary: text().notNull(),
    /** What the learner asked for when this path was planned, if they asked for anything. */
    request: text(),
    /** Model and prompt version that planned it, for auditability. */
    model: text(),
    promptVersion: text(),
    archivedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index().on(t.userId),
    // One active path per learner: of two plans racing, the second fails instead of both standing.
    uniqueIndex("learning_path_active_index")
      .on(t.userId)
      .where(sql`${t.archivedAt} is null`),
  ],
);

export const learningPathItem = pgTable(
  "learning_path_item",
  {
    id: id(),
    pathId: uuid()
      .notNull()
      .references(() => learningPath.id, { onDelete: "cascade" }),
    skillId: uuid().references(() => skill.id, { onDelete: "set null" }),
    title: text().notNull(),
    /** "Why are you learning this?" Required by PRD §12 and principle 6. */
    reason: text().notNull(),
    order: integer().notNull(),
    status: pathItemStatus().default("upcoming").notNull(),
    /** For a deferred item ("not yet"): what has to be true before it unlocks. */
    unlockWhen: text(),
    /** How to study this step, written when it's first opened as the current step. */
    guide: jsonb().$type<StudyGuide>(),
    /** Model and prompt version that wrote the guide. */
    guideGeneratedBy: text(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.pathId)],
);

export type MissionResource = { title: string; url?: string; kind: string; note?: string };
export type EvaluationCriterion = { key: string; label: string; description: string; maxScore: number };

/** A concrete thing to do (PRD §13, §14). Daily missions and weekly challenges share this table. */
export const mission = pgTable(
  "mission",
  {
    id: id(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    pathItemId: uuid().references(() => learningPathItem.id, { onDelete: "set null" }),
    type: missionType().notNull(),
    cadence: missionCadence().default("daily").notNull(),
    status: missionStatus().default("assigned").notNull(),
    title: text().notNull(),
    objective: text().notNull(),
    /** The situation it's set in: who needs this and what makes it interesting. */
    scenario: text(),
    /** Why the mentor is assigning this now. */
    reason: text().notNull(),
    instructions: text().notNull(),
    requiredKnowledge: jsonb().$type<string[]>().default([]).notNull(),
    deliverable: text().notNull(),
    /** Checkable statements of done: what the evaluation looks for. */
    acceptanceCriteria: jsonb().$type<string[]>().default([]).notNull(),
    /** A harder extension for when they finish early. */
    stretchGoal: text(),
    /** "Your stack: Next.js" or "Exploring: Redis". */
    stack: text(),
    evaluationCriteria: jsonb().$type<EvaluationCriterion[]>().default([]).notNull(),
    resources: jsonb().$type<MissionResource[]>().default([]).notNull(),
    estimatedMinutes: integer(),
    /** 1 (guided) to 5 (an open problem they haven't seen), from planDifficulty. */
    difficulty: integer(),
    dueAt: timestamp({ withTimezone: true }),
    generatedBy: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index().on(t.userId, t.status),
    // One mission in play per learner and cadence: a racing second assignment fails instead of
    // stacking a second daily mission.
    uniqueIndex("mission_active_index")
      .on(t.userId, t.cadence)
      .where(sql`${t.status} in ('assigned', 'in_progress', 'submitted')`),
  ],
);

export const missionSkill = pgTable(
  "mission_skill",
  {
    missionId: uuid()
      .notNull()
      .references(() => mission.id, { onDelete: "cascade" }),
    skillId: uuid()
      .notNull()
      .references(() => skill.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.missionId, t.skillId] })],
);

export type SubmissionArtifact = {
  kind: "link" | "repo" | "image" | "file" | "text";
  url?: string;
  label?: string;
};
export type Reflection = {
  difficult?: string;
  understoodBetter?: string;
  wouldChange?: string;
  stillConfused?: string;
};

/** Evidence the learner submits for a mission (PRD §15, §20). */
export const missionSubmission = pgTable(
  "mission_submission",
  {
    id: id(),
    missionId: uuid()
      .notNull()
      .references(() => mission.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    content: text(),
    artifacts: jsonb().$type<SubmissionArtifact[]>().default([]).notNull(),
    reflection: jsonb().$type<Reflection>(),
    submittedAt: createdAt(),
  },
  (t) => [index().on(t.missionId)],
);
