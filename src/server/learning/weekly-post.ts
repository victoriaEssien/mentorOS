import "server-only";
import { and, asc, desc, eq, gte, inArray, lt } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import { db } from "@/db";
import {
  assessment,
  assessmentAttempt,
  assessmentItem,
  evaluation,
  learningNote,
  mission,
  missionSubmission,
  weeklyPost,
} from "@/db/schema";
import type { ItemPrompt } from "@/lib/assessment-response";
import { CODE_LANGUAGE_LABEL } from "@/lib/code-languages";
import { abilityLabel } from "@/lib/skill-labels";
import { draftWeeklyPost, PROMPT_VERSION, type PostWeek } from "@/server/ai/modules/post-drafter";
import { getPathOverview } from "@/server/queries/path";
import { getTaxonomy } from "@/server/queries/skills";
import { take, type Limit } from "@/server/throttle";

import type { SkillChange } from "./evidence";
import { tidyPost } from "./post-text";

/** A first draft and a few rewrites a week is plenty; each one is a model call. */
const DRAFTS_A_WEEK: Limit = { max: 4, perSeconds: 8 * 24 * 60 * 60 };
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export class NothingToPostError extends Error {
  constructor() {
    super("Nothing happened this week to post about");
    this.name = "NothingToPostError";
  }
}

export class TooManyDraftsError extends Error {
  constructor() {
    super("Too many drafts this week");
    this.name = "TooManyDraftsError";
  }
}

/**
 * Drafts (or redrafts) the learner's post for the week starting on `weekStart` (Part E), from what
 * that week's evidence shows, and saves it. Throws NothingToPostError for an empty week.
 */
export async function draftPost(userId: string, weekStart: string) {
  const week = await gatherWeek(userId, weekStart);
  const handedIn =
    week.missions.filter((m) => m.outcome).length + week.dailySets.filter((d) => d.outcome).length;
  if (handedIn === 0 && week.notes.length === 0) throw new NothingToPostError();
  if (!(await take(`post-draft:${userId}:${weekStart}`, DRAFTS_A_WEEK))) throw new TooManyDraftsError();

  const { post, meta } = await draftWeeklyPost(week);
  const { linkedin, x } = tidyPost(post);
  const values = { linkedin, x, drewOn: post.drewOn, generatedBy: `${meta.model}/${PROMPT_VERSION}` };
  const [saved] = await db
    .insert(weeklyPost)
    .values({ userId, weekStart, ...values })
    .onConflictDoUpdate({ target: [weeklyPost.userId, weeklyPost.weekStart], set: values })
    .returning();
  return saved!;
}

/**
 * Everything a week shows: missions given that week with their outcome and the learner's own
 * reflection, daily sets with how they went and in which languages, notes, the skills whose
 * estimates moved, and the step that comes next.
 */
export async function gatherWeek(userId: string, weekStart: string): Promise<PostWeek> {
  const from = new Date(`${weekStart}T00:00:00Z`);
  const to = new Date(from.getTime() + WEEK_MS);
  const inWeek = (column: AnyPgColumn) => and(gte(column, from), lt(column, to));

  const [missions, sets, path, { skills }] = await Promise.all([
    db
      .select({
        id: mission.id,
        title: mission.title,
        cadence: mission.cadence,
        stack: mission.stack,
        status: mission.status,
      })
      .from(mission)
      .where(and(eq(mission.userId, userId), inWeek(mission.createdAt)))
      .orderBy(asc(mission.createdAt)),
    db
      .select({ id: assessment.id, day: assessment.day })
      .from(assessment)
      .where(and(eq(assessment.userId, userId), eq(assessment.kind, "daily"), inWeek(assessment.createdAt)))
      .orderBy(asc(assessment.day)),
    getPathOverview(userId),
    getTaxonomy(),
  ]);
  const missionIds = missions.map((m) => m.id);
  const setIds = sets.map((s) => s.id);

  const [submissions, setResults, items, notes, evaluations] = await Promise.all([
    missionIds.length > 0
      ? db
          .select({
            missionId: missionSubmission.missionId,
            reflection: missionSubmission.reflection,
            outcome: evaluation.outcome,
          })
          .from(missionSubmission)
          .leftJoin(evaluation, eq(evaluation.submissionId, missionSubmission.id))
          .where(inArray(missionSubmission.missionId, missionIds))
          .orderBy(desc(missionSubmission.submittedAt))
      : [],
    setIds.length > 0
      ? db
          .select({
            assessmentId: assessmentAttempt.assessmentId,
            outcome: evaluation.outcome,
            result: evaluation.result,
          })
          .from(assessmentAttempt)
          .innerJoin(evaluation, eq(evaluation.attemptId, assessmentAttempt.id))
          .where(inArray(assessmentAttempt.assessmentId, setIds))
      : [],
    setIds.length > 0
      ? db
          .select({
            assessmentId: assessmentItem.assessmentId,
            type: assessmentItem.type,
            prompt: assessmentItem.prompt,
          })
          .from(assessmentItem)
          .where(inArray(assessmentItem.assessmentId, setIds))
      : [],
    db
      .select({ learned: learningNote.learned, gotWrong: learningNote.gotWrong })
      .from(learningNote)
      .where(and(eq(learningNote.userId, userId), inWeek(learningNote.createdAt))),
    db
      .select({ result: evaluation.result })
      .from(evaluation)
      .where(and(eq(evaluation.userId, userId), inWeek(evaluation.createdAt)))
      .orderBy(asc(evaluation.createdAt)),
  ]);

  // Latest submission per mission comes first.
  const submissionByMission = new Map<string, (typeof submissions)[number]>();
  for (const row of submissions)
    if (!submissionByMission.has(row.missionId)) submissionByMission.set(row.missionId, row);

  // Each skill once: where it started this week and where it ended.
  const nameById = new Map(skills.map((s) => [s.id, s.name]));
  const moved = new Map<string, { before: number; after: number }>();
  for (const row of evaluations) {
    for (const change of (row.result as { changes?: SkillChange[] }).changes ?? []) {
      const seen = moved.get(change.skillId);
      moved.set(change.skillId, {
        before: seen?.before ?? change.before.ability,
        after: change.after.ability,
      });
    }
  }

  return {
    weekStart,
    missions: missions.map((m) => {
      const submission = submissionByMission.get(m.id);
      return {
        title: m.title,
        cadence: m.cadence,
        stack: m.stack,
        status: m.status,
        outcome: submission?.outcome ?? null,
        learned: submission?.reflection?.learned ?? null,
        gotWrong: submission?.reflection?.gotWrong ?? null,
      };
    }),
    dailySets: sets.map((set) => {
      const graded = setResults.find((r) => r.assessmentId === set.id);
      const own = items.filter((i) => i.assessmentId === set.id);
      return {
        day: set.day ?? weekStart,
        outcome: graded?.outcome ?? null,
        score: graded ? (graded.result as { score: number }).score : null,
        languages: [
          ...new Set(
            own.flatMap((i) =>
              (i.prompt as ItemPrompt).language
                ? [CODE_LANGUAGE_LABEL[(i.prompt as ItemPrompt).language!]]
                : [],
            ),
          ),
        ],
        kinds: own.map((i) => i.type),
      };
    }),
    notes,
    skills: [...moved.entries()]
      .filter(
        ([, change]) =>
          abilityLabel(change.before) !== abilityLabel(change.after) ||
          Math.abs(change.after - change.before) >= 0.05,
      )
      .flatMap(([skillId, change]) => {
        const name = nameById.get(skillId);
        return name
          ? [
              {
                name,
                before: abilityLabel(change.before).toLowerCase(),
                after: abilityLabel(change.after).toLowerCase(),
              },
            ]
          : [];
      })
      .slice(0, 6),
    focus: path.current?.title ?? null,
  };
}

/** Saves what the learner noted after a daily set. Never evidence. */
export async function saveDailyNote(userId: string, assessmentId: string, learned: string, gotWrong: string) {
  const [owned] = await db
    .select({ id: assessment.id })
    .from(assessment)
    .where(and(eq(assessment.id, assessmentId), eq(assessment.userId, userId), eq(assessment.kind, "daily")))
    .limit(1);
  if (!owned) return false;
  await db
    .insert(learningNote)
    .values({ userId, assessmentId, learned, gotWrong })
    .onConflictDoUpdate({
      target: [learningNote.userId, learningNote.assessmentId],
      set: { learned, gotWrong },
    });
  return true;
}
