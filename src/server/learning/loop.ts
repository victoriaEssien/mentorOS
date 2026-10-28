import "server-only";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { learnerProfile, userTrack } from "@/db/schema";
import { getActiveTrackIds } from "@/server/queries/skills";

import { gradeAttempt } from "./assessment-grading";
import { checkOnSkill, surpriseCheckIfDue } from "./checks";
import { ensureDailySet, runExamples } from "./daily";
import { ensureDiagnostic } from "./diagnostic";
import { getMentorThread, hintOnQuestion, replyInThread } from "./mentor-chat";
import { assignMission, expireOverdueMissions, type Cadence } from "./missions";
import { hasActivePath, planPath } from "./path";
import { updateLearnerSettings, type LearnerSettings } from "./settings";
import { ensureStudyGuide } from "./study-guide";
import { draftPost, saveDailyNote } from "./weekly-post";
import { submitWork, type WorkInput } from "./submissions";

/**
 * The core loop (PRD §40): Assess → Learn → Practice → Prove → Evaluate → Adapt.
 *
 * These orchestrators are the only code that writes learner state. Each one:
 *   1. builds LearnerContext from the database
 *   2. calls one or more AI modules for validated, structured output
 *   3. persists the output and derives skill_evidence
 *   4. recomputes user_skill via estimateSkill
 *
 * Server actions and route handlers call these; pages never call AI modules directly.
 */

export type OnboardingInput = {
  goals: string[];
  customGoal: string | null;
  currentRole: string | null;
  yearsExperience: number | null;
  technologiesUsed: string[];
  previousLearning: string | null;
  existingProjects: string | null;
  weeklyLearningHours: number | null;
  learningStyle: string | null;
  mentorTone: "direct" | "balanced" | "supportive";
};

/**
 * Saves onboarding context and gives the learner every active track (nobody picks), in one
 * transaction, then writes the diagnostic. Background is context for the mentor; it never writes a
 * skill estimate. Safe to call again: it replaces the previous answers and reuses an unstarted
 * diagnostic.
 *
 * If the diagnostic can't be written (model down, bad output), onboarding still counts as done and
 * assessmentId is null; Today offers to build it again.
 */
export async function completeOnboarding(
  userId: string,
  profile: OnboardingInput,
): Promise<{ assessmentId: string | null }> {
  const now = new Date();
  const trackIds = await getActiveTrackIds();

  await db.batch([
    db
      .insert(learnerProfile)
      .values({ userId, ...profile, onboardingCompletedAt: now })
      .onConflictDoUpdate({ target: learnerProfile.userId, set: { ...profile, onboardingCompletedAt: now } }),
    db.delete(userTrack).where(eq(userTrack.userId, userId)),
    db.insert(userTrack).values(trackIds.map((trackId) => ({ userId, trackId }))),
  ]);

  try {
    return { assessmentId: await ensureDiagnostic(userId) };
  } catch (error) {
    console.error(JSON.stringify({ event: "diagnostic.failed", userId, reason: String(error) }));
    return { assessmentId: null };
  }
}

/**
 * Writes the diagnostic (PRD §9) for a learner onboarding couldn't write one for, or returns the
 * one already waiting. One model call per group of skills, about a minute in all.
 */
export async function startDiagnostic(userId: string): Promise<{ assessmentId: string }> {
  return { assessmentId: await ensureDiagnostic(userId) };
}

/**
 * Grades a handed-in assessment attempt and records its evidence (PRD §9, §10). Throws
 * AssessmentClosedError if the attempt was already handed in.
 *
 * `replan` says the evidence should reshape the path: always after the diagnostic (it produces
 * the first path), and whenever the learner has no path yet. Planning takes a model call, so the
 * caller runs it after responding (refreshLearningPath).
 */
export async function submitAssessmentAttempt(
  userId: string,
  attemptId: string,
): Promise<{ evaluationId: string; replan: boolean }> {
  const { evaluationId, kind } = await gradeAttempt(userId, attemptId);
  return { evaluationId, replan: kind === "diagnostic" || !(await hasActivePath(userId)) };
}

/**
 * Plans a fresh learning path from the current evidence (PRD §12, §17), optionally around
 * something the learner asked for. The old path is archived. Skills whose prerequisites aren't met
 * are never scheduled; they come back as "not yet" with what would unlock them.
 */
export async function refreshLearningPath(
  userId: string,
  learnerRequest: string | null = null,
): Promise<{ pathId: string }> {
  return planPath(userId, learnerRequest);
}

/**
 * How to study a step of the learner's path (Part D), written the first time it's asked for: one
 * model call, about twenty seconds. Null while another request is writing it.
 */
export async function studyGuide(userId: string, pathItemId: string) {
  return ensureStudyGuide(userId, pathItemId);
}

/**
 * Drafts the learner's LinkedIn and X posts for a week (Part E) from what that week's evidence
 * shows, replacing any earlier draft. One model call; a few drafts a week at most.
 */
export async function weeklyPostDraft(userId: string, weekStart: string) {
  return draftPost(userId, weekStart);
}

/** What the learner learned and got wrong in a daily set, in their words. Never evidence. */
export async function noteDailySet(userId: string, assessmentId: string, learned: string, gotWrong: string) {
  return saveDailyNote(userId, assessmentId, learned, gotWrong);
}

/**
 * Changes what the learner told us at onboarding (PRD §8): goals, weekly time, learning style,
 * mentor tone. None of these reshape the path, so nothing is planned again.
 */
export async function changeSettings(userId: string, changes: Partial<LearnerSettings>): Promise<void> {
  await updateLearnerSettings(userId, changes);
}

/**
 * Marks the learner's missions that ran out of time as missed (24 hours for a daily mission, a week
 * for a challenge). Pages that show missions call this first, so nothing overdue looks open.
 */
export async function expireMissions(userId: string): Promise<void> {
  await expireOverdueMissions(userId);
}

/**
 * The learner's next mission for their current path item (PRD §13, §17), or the one already in
 * play for this cadence. Throws NoPathError when there is no path to work from yet.
 */
export async function assignNextMission(
  userId: string,
  cadence: Cadence = "daily",
): Promise<{ missionId: string; created: boolean }> {
  return assignMission(userId, cadence);
}

/**
 * Hands in work for a mission and evaluates it (PRD §15, §16, §20): scores per criterion, skill
 * evidence, and path progress when it passes. `pathFinished` means the path ran out of steps and
 * should be planned again (refreshLearningPath), which the caller runs after responding.
 */
export async function submitMission(
  userId: string,
  missionId: string,
  work: WorkInput,
): Promise<{ evaluationId: string; pathFinished: boolean }> {
  const { evaluationId, pathFinished } = await submitWork(userId, missionId, work);
  return { evaluationId, pathFinished };
}

/**
 * A check on one skill the learner asked for ("I think I understand this. Test me."). When the
 * estimate rests on too little evidence it is pitched as a reassessment instead (PRD §18).
 */
export async function testSkill(userId: string, skillSlug: string): Promise<{ assessmentId: string }> {
  return checkOnSkill(userId, skillSlug);
}

const surprisesInFlight = new Map<string, Promise<{ assessmentId: string } | null>>();

/** Today's surprise check, when one is due (PRD §18). Null on most days. */
export function surpriseCheck(userId: string): Promise<{ assessmentId: string } | null> {
  // Writing one is a model call, and Today asks on every visit: two quick visits on the day one
  // is due share the same write instead of paying for two.
  const inFlight = surprisesInFlight.get(userId);
  if (inFlight) return inFlight;

  const pending = surpriseCheckIfDue(userId)
    .then((assessmentId) => (assessmentId ? { assessmentId } : null))
    .finally(() => surprisesInFlight.delete(userId));
  surprisesInFlight.set(userId, pending);
  return pending;
}

/**
 * The learner's daily coding set for their calendar day (Part C), written first if there isn't one:
 * five questions in parallel, each run in the sandbox before it's kept, a minute or two in all.
 */
export async function dailySet(userId: string, day: string): Promise<{ assessmentId: string }> {
  return { assessmentId: await ensureDailySet(userId, day) };
}

/** Runs code for a daily question against its examples. Records nothing; capped per hour. */
export async function runDailyCode(userId: string, assessmentId: string, itemId: string, code: string) {
  return runExamples(userId, assessmentId, itemId, code);
}

/** The learner's mentor thread with its recent messages, started on first visit (PRD §21). */
export async function mentorThread(userId: string) {
  return getMentorThread(userId);
}

/**
 * One mentor turn: stores the learner's message and streams the reply as an AI SDK UI message
 * stream. The mentor acts only through its tools (mentor-tools.ts), which go through this layer.
 */
export async function mentorTurn(
  userId: string,
  conversationId: string,
  message: unknown,
): Promise<Response> {
  return replyInThread(userId, conversationId, message);
}

/**
 * A hint on an assessment question, streamed (PRD §22). Counts toward the question's hints, which
 * lower how much the answer counts as evidence; never reveals the answer.
 */
export async function assessmentHint(
  userId: string,
  assessmentId: string,
  itemId: string,
  conversation: unknown,
): Promise<Response> {
  return hintOnQuestion(userId, assessmentId, itemId, conversation);
}
