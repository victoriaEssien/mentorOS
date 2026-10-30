import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import type { ProjectForm } from "../../lib/themes";

import { createdAt, id, missionCadence, missionStatus, missionType, updatedAt } from "./_shared";
import { user } from "./auth";

export type MissionResource = { title: string; url?: string; kind: string; note?: string };
export type EvaluationCriterion = { key: string; label: string; description: string; maxScore: number };

/** A project: the brief for a theme's build, from the Project Writer. */
export const mission = pgTable(
  "mission",
  {
    id: id(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** The theme it belongs to, from src/lib/themes.ts. */
    themeSlug: text(),
    type: missionType().notNull(),
    cadence: missionCadence().default("weekly").notNull(),
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
    /** What it's built as (src/server/learning/project-form.ts); null before forms existed. */
    form: text().$type<ProjectForm>(),
    /** "CLI tool, your stack: Node.js" or "Web app, exploring: Svelte". */
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
    // One project in play per learner: a racing second assignment fails instead of stacking.
    uniqueIndex("mission_active_index")
      .on(t.userId, t.cadence)
      .where(sql`${t.status} in ('assigned', 'in_progress', 'submitted')`),
  ],
);

export type SubmissionArtifact = {
  kind: "link" | "repo" | "image" | "file" | "text";
  url?: string;
  label?: string;
};
export type Reflection = {
  /** Asked on every hand-in since the weekly post: what they learned, and what they got wrong. */
  learned?: string;
  gotWrong?: string;
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
