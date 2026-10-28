import "server-only";
import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";

import { db } from "@/db";
import { isUniqueViolation } from "@/db/errors";
import { assessment, assessmentAttempt, assessmentItem, evaluation } from "@/db/schema";
import type { ItemPrompt } from "@/lib/assessment-response";
import { TESTED_ITEM_TYPES, type TestCase } from "@/lib/code-languages";
import { writeCodingQuestion, PROMPT_VERSION } from "@/server/ai/modules/coding-question-writer";
import { getPrerequisiteEdges, getSkillStates, getTaxonomy } from "@/server/queries/skills";
import { runnerConfigured, RunnerUnavailableError, runTests, type RunOutcome } from "@/server/runner/run";
import { release, take, type Limit } from "@/server/throttle";

import type { AttemptEvaluationResult } from "./assessment-grading";
import { checkQuestion, cleanQuestion } from "./daily-check";
import { DAILY_POOLS, planDailySet, type PlannedQuestion } from "./daily-plan";
import type { Outcome } from "./difficulty";
import { blockedSkills } from "./readiness";

/**
 * The daily coding set (Part C): five questions a day, written on demand, each one run in the
 * sandbox before the learner sees it. It's an assessment of kind "daily", so answering, hints,
 * grading and evidence work exactly as for any other assessment.
 */

const DAILY_WRITE: Limit = { max: 1, perSeconds: 300 };
/** Runs against the examples while working, per learner: generous, but the sandbox has a monthly allowance. */
const CODE_RUNS: Limit = { max: 60, perSeconds: 3600 };
const WAIT_FOR_OTHER_WRITE_MS = 150_000;
/** Fewer than this many questions survive their checks, and the set isn't worth saving. */
const MIN_QUESTIONS = 3;

export class TooManyRunsError extends Error {
  constructor() {
    super("Too many code runs this hour");
    this.name = "TooManyRunsError";
  }
}

export class NotRunnableError extends Error {
  constructor() {
    super("This question isn't answered with code that runs");
    this.name = "NotRunnableError";
  }
}

/** The day's set, if it's been written. */
export async function findDailySet(userId: string, day: string): Promise<string | null> {
  const [row] = await db
    .select({ id: assessment.id })
    .from(assessment)
    .where(and(eq(assessment.userId, userId), eq(assessment.kind, "daily"), eq(assessment.day, day)))
    .limit(1);
  return row?.id ?? null;
}

/**
 * Returns the day's set, writing it first if there isn't one. A request that arrives while another
 * is writing waits for that one. Throws RunnerUnavailableError when code can't be run, since every
 * question is checked by running it.
 */
export async function ensureDailySet(userId: string, day: string): Promise<string> {
  const existing = await findDailySet(userId, day);
  if (existing) return existing;
  if (!runnerConfigured()) throw new RunnerUnavailableError("no snapshot configured");

  const lock = `daily-write:${userId}:${day}`;
  if (!(await take(lock, DAILY_WRITE))) return waitForDailySet(userId, day);
  try {
    return (await findDailySet(userId, day)) ?? (await writeDailySet(userId, day));
  } finally {
    await release(lock).catch(() => undefined);
  }
}

async function waitForDailySet(userId: string, day: string): Promise<string> {
  const deadline = Date.now() + WAIT_FOR_OTHER_WRITE_MS;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 2_500));
    const id = await findDailySet(userId, day);
    if (id) return id;
  }
  throw new Error("Today's set is still being written by another request.");
}

async function writeDailySet(userId: string, day: string): Promise<string> {
  const started = performance.now();
  const [{ skills }, estimates, edges, history] = await Promise.all([
    getTaxonomy(),
    getSkillStates(userId),
    getPrerequisiteEdges(),
    dailyHistory(userId),
  ]);
  const skillBySlug = new Map(skills.map((s) => [s.slug, s]));
  const pooled = [...new Set(Object.values(DAILY_POOLS).flat())].filter((slug) => skillBySlug.has(slug));

  const plan = planDailySet({
    day,
    skills: estimates,
    blocked: new Set(blockedSkills(pooled, edges, estimates).map((b) => b.skill)),
    recent: history.recentSkills,
    outcomes: history.outcomes,
  }).filter((question) => skillBySlug.has(question.skill));

  const written = await Promise.all(
    plan.map((planned) => writeChecked(planned, skillBySlug.get(planned.skill)!, history.titles)),
  );
  const kept = written.flatMap((entry, index) => (entry ? [{ ...entry, planned: plan[index]! }] : []));
  if (kept.length < MIN_QUESTIONS) {
    throw new Error(`Only ${kept.length} of ${plan.length} questions passed their checks.`);
  }

  const debugging = skillBySlug.get("debugging");
  const assessmentId = crypto.randomUUID();
  try {
    await db.batch([
      db.insert(assessment).values({
        id: assessmentId,
        userId,
        kind: "daily",
        day,
        title: "Daily five",
        reason:
          "Five questions in the languages you're learning, on the skills that need it most. Every test was checked against a working solution.",
        targetSkillIds: [...new Set(kept.map((entry) => skillBySlug.get(entry.planned.skill)!.id))],
        generatedBy: [...new Set(kept.map((entry) => entry.model))]
          .map((m) => `${m}/${PROMPT_VERSION}`)
          .join(", "),
      }),
      db.insert(assessmentItem).values(
        kept.map((entry, order) => {
          const skillId = skillBySlug.get(entry.planned.skill)!.id;
          const prompt: ItemPrompt = {
            title: entry.question.title,
            question: cleanQuestion(entry.question.question),
            code: entry.question.code,
            options: null,
            language: entry.planned.language,
            examples: entry.examples,
          };
          return {
            assessmentId,
            type: entry.planned.kind,
            order,
            prompt,
            rubric: {
              expected: entry.question.expected,
              gradingNotes: entry.question.gradingNotes,
              correctOption: null,
              tests: entry.tests,
              solution: entry.question.solution,
              output: entry.output,
            },
            skillIds:
              entry.planned.kind === "fix_bug" && debugging && debugging.id !== skillId
                ? [skillId, debugging.id]
                : [skillId],
            difficulty: entry.planned.difficulty,
            timeLimitSeconds: null,
          };
        }),
      ),
    ]);
  } catch (error) {
    // Another request saved the day's set first.
    if (isUniqueViolation(error)) {
      const winner = await findDailySet(userId, day);
      if (winner) return winner;
    }
    throw error;
  }

  console.info(
    JSON.stringify({
      event: "daily.written",
      assessmentId,
      questions: kept.length,
      dropped: plan.length - kept.length,
      durationMs: Math.round(performance.now() - started),
    }),
  );
  return assessmentId;
}

/** Writes one question and runs it; a question that fails its checks gets one rewrite, told why. */
async function writeChecked(
  planned: PlannedQuestion,
  skill: { slug: string; name: string; description: string | null },
  titles: ReadonlyMap<string, string[]>,
) {
  let retryReason: string | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { question, meta } = await writeCodingQuestion({
        kind: planned.kind,
        language: planned.language,
        skill,
        difficulty: planned.difficulty,
        recentTitles: titles.get(skill.slug) ?? [],
        retryReason,
      });
      const checked = await checkQuestion(planned.kind, planned.language, question, runTests);
      if (checked.ok) return { question, model: meta.model, ...checked };
      retryReason = checked.reason;
    } catch (error) {
      if (error instanceof RunnerUnavailableError) throw error;
      retryReason = "the last attempt failed to generate";
      console.error(
        JSON.stringify({ event: "daily.question_failed", kind: planned.kind, reason: String(error) }),
      );
    }
    console.warn(
      JSON.stringify({ event: "daily.question_rejected", kind: planned.kind, attempt, retryReason }),
    );
  }
  return null;
}

/**
 * What recent sets asked and how they went: the skills of the last three sets (so today's set moves
 * on), recent titles per skill (so a question isn't repeated), and each skill's recent outcomes
 * with their difficulty (so the level climbs or steps back).
 */
async function dailyHistory(userId: string) {
  const sets = await db
    .select({ id: assessment.id })
    .from(assessment)
    .where(and(eq(assessment.userId, userId), eq(assessment.kind, "daily")))
    .orderBy(desc(assessment.createdAt))
    .limit(10);
  const history = {
    recentSkills: [] as string[],
    titles: new Map<string, string[]>(),
    outcomes: new Map<string, { outcome: Outcome; difficulty: number }[]>(),
  };
  if (sets.length === 0) return history;

  const setIds = sets.map((s) => s.id);
  const [{ skills }, items, graded] = await Promise.all([
    getTaxonomy(),
    db
      .select({
        id: assessmentItem.id,
        assessmentId: assessmentItem.assessmentId,
        prompt: assessmentItem.prompt,
        skillIds: assessmentItem.skillIds,
        difficulty: assessmentItem.difficulty,
      })
      .from(assessmentItem)
      .where(inArray(assessmentItem.assessmentId, setIds)),
    db
      .select({ assessmentId: assessmentAttempt.assessmentId, result: evaluation.result })
      .from(evaluation)
      .innerJoin(assessmentAttempt, eq(assessmentAttempt.id, evaluation.attemptId))
      .where(and(inArray(assessmentAttempt.assessmentId, setIds), isNotNull(evaluation.attemptId))),
  ]);
  const slugById = new Map(skills.map((s) => [s.id, s.slug]));
  const order = new Map(setIds.map((id, index) => [id, index]));
  const newestFirst = [...items].sort((a, b) => order.get(a.assessmentId)! - order.get(b.assessmentId)!);
  const verdictByItem = new Map(
    graded.flatMap((row) =>
      (row.result as AttemptEvaluationResult).items.map((item) => [item.itemId, item.verdict]),
    ),
  );

  const recentSets = new Set(setIds.slice(0, 3));
  for (const item of newestFirst) {
    const slug = item.skillIds.map((id) => slugById.get(id)).find(Boolean);
    if (!slug) continue;
    if (recentSets.has(item.assessmentId)) history.recentSkills.push(slug);
    const title = (item.prompt as ItemPrompt).title;
    if (title) history.titles.set(slug, [...(history.titles.get(slug) ?? []), title].slice(0, 5));
    const verdict = verdictByItem.get(item.id);
    if (verdict) {
      history.outcomes.set(slug, [
        ...(history.outcomes.get(slug) ?? []),
        { outcome: verdict, difficulty: item.difficulty },
      ]);
    }
  }
  return history;
}

/**
 * Runs the learner's code against a question's examples while they work. Hidden tests only run
 * when they hand in. Nothing is recorded; the hourly cap keeps the sandbox allowance safe.
 */
export async function runExamples(
  userId: string,
  assessmentId: string,
  itemId: string,
  code: string,
): Promise<{ examples: TestCase[]; run: RunOutcome }> {
  const [row] = await db
    .select({ type: assessmentItem.type, prompt: assessmentItem.prompt })
    .from(assessmentItem)
    .innerJoin(assessment, eq(assessment.id, assessmentItem.assessmentId))
    .where(and(eq(assessmentItem.id, itemId), eq(assessment.id, assessmentId), eq(assessment.userId, userId)))
    .limit(1);
  const prompt = row?.prompt as ItemPrompt | undefined;
  if (!row || !prompt?.language || !TESTED_ITEM_TYPES.includes(row.type)) throw new NotRunnableError();
  if (!(await take(`code-run:${userId}`, CODE_RUNS))) throw new TooManyRunsError();

  const examples = prompt.examples ?? [];
  return { examples, run: await runTests(prompt.language, code, examples) };
}
