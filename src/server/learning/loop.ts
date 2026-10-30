import "server-only";

import { db } from "@/db";
import { learnerProfile } from "@/db/schema";

import { answerFollowUp, ensureSession, explainAttempt, prepareAttempt } from "./concepts";
import { getMentorThread, replyInThread } from "./mentor-chat";
import { assignProject, expireOverdueMissions } from "./missions";
import { updateLearnerSettings, type LearnerSettings } from "./settings";
import { resetLearning } from "./start-over";
import { ensureThemeRun } from "./themes";
import { submitWork, type WorkInput } from "./submissions";
import { draftPostForProject } from "./project-post";

/**
 * The loop: the app picks the week's theme, hands over a concept a day (plus the reviews that are
 * due) and a project for the theme; the learner researches, explains and builds their own way; it's
 * graded, rescheduled, reviewed and turned into something to post.
 *
 * These orchestrators are the only code that writes learner state. Server actions and route
 * handlers call these; pages never call AI modules directly.
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
 * Saves what the learner told us at onboarding. Their technologies become the stack projects go
 * deeper in; the rest shapes how the mentor talks to them. Safe to call again: it replaces the
 * previous answers.
 */
export async function completeOnboarding(userId: string, profile: OnboardingInput): Promise<void> {
  const now = new Date();
  await db
    .insert(learnerProfile)
    .values({ userId, ...profile, onboardingCompletedAt: now })
    .onConflictDoUpdate({ target: learnerProfile.userId, set: { ...profile, onboardingCompletedAt: now } });
}

/** The learner's theme for a day, started the first time it's asked for. No model call. */
export async function currentTheme(userId: string, today: string) {
  return ensureThemeRun(userId, today);
}

/**
 * Today's session: the week's theme, the one new concept for the day and up to three due reviews.
 * Built from plain code the first time it's asked for each day; no model call.
 */
export async function dailySession(userId: string, today: string) {
  return ensureSession(userId, today);
}

/**
 * Gets a concept ready to explain: writes the concept (its checklist and reference) the first time
 * it's ever opened, and for a review, a fresh question. A model call or two, about ten seconds.
 */
export async function prepareConcept(userId: string, attemptId: string) {
  return prepareAttempt(userId, attemptId);
}

/**
 * Grades an explanation against the concept's stored checklist, strictly, with a follow-up question,
 * and moves the concept's next review by the verdict. One model call.
 */
export async function explainConcept(userId: string, attemptId: string, explanation: string, today: string) {
  return explainAttempt(userId, attemptId, explanation, today);
}

/** A short check of the answer to a concept's follow-up question. One fast model call. */
export async function answerConceptFollowUp(userId: string, attemptId: string, answer: string) {
  return answerFollowUp(userId, attemptId, answer);
}

/**
 * The project for the learner's current theme, written the first time it's asked for: one model
 * call, about half a minute. It runs for the theme's one or two weeks.
 */
export async function themeProject(
  userId: string,
  today: string,
): Promise<{ missionId: string; created: boolean }> {
  return assignProject(userId, today);
}

/**
 * Marks the learner's projects that ran out of time as missed. Pages that show projects call this
 * first, so nothing overdue looks open.
 */
export async function expireMissions(userId: string): Promise<void> {
  await expireOverdueMissions(userId);
}

/** Changes what the learner told us at onboarding: goals, weekly time, learning style, tone. */
export async function changeSettings(userId: string, changes: Partial<LearnerSettings>): Promise<void> {
  await updateLearnerSettings(userId, changes);
}

/**
 * Starts them over from the first theme: clears everything they've learned and built, and sends
 * them back through onboarding. Their account stays. No model call.
 */
export async function startOver(userId: string): Promise<void> {
  await resetLearning(userId);
}

/** Hands in a project and reviews it against its brief: scores per criterion and what to do next. */
export async function submitMission(
  userId: string,
  missionId: string,
  work: WorkInput,
): Promise<{ evaluationId: string }> {
  const { evaluationId } = await submitWork(userId, missionId, work);
  return { evaluationId };
}

/** The learner's mentor thread with its recent messages, started on first visit. */
export async function mentorThread(userId: string) {
  return getMentorThread(userId);
}

/**
 * One mentor turn: stores the learner's message and streams the reply as an AI SDK UI message
 * stream. The mentor acts only through its tools (mentor-tools.ts).
 */
export async function mentorTurn(
  userId: string,
  conversationId: string,
  message: unknown,
): Promise<Response> {
  return replyInThread(userId, conversationId, message);
}

/**
 * Drafts (or redrafts) a reviewed project's posts for X and LinkedIn: what was built and what was
 * hard. One model call; a few drafts per project at most.
 */
export async function projectPostDraft(userId: string, missionId: string) {
  return draftPostForProject(userId, missionId);
}
