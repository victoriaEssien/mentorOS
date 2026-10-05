import { index, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

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

/** A learner's personalised path (PRD §12). Old paths are archived, not edited, so changes are traceable. */
export const learningPath = pgTable(
  "learning_path",
  {
    id: id(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    focusSummary: text().notNull(),
    archivedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.userId)],
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
    /** Why the mentor is assigning this now. */
    reason: text().notNull(),
    instructions: text().notNull(),
    requiredKnowledge: jsonb().$type<string[]>().default([]).notNull(),
    deliverable: text().notNull(),
    evaluationCriteria: jsonb().$type<EvaluationCriterion[]>().default([]).notNull(),
    resources: jsonb().$type<MissionResource[]>().default([]).notNull(),
    estimatedMinutes: integer(),
    dueAt: timestamp({ withTimezone: true }),
    generatedBy: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.userId, t.status)],
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
