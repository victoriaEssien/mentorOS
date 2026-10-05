import "server-only";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { learnerProfile, userTrack } from "@/db/schema";
import { NotImplementedError } from "@/lib/errors";

import { ensureDiagnostic } from "./diagnostic";

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
  trackIds: string[];
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
 * Saves onboarding context (PRD §8) and the learner's tracks in one transaction, then writes the
 * diagnostic. Background is context for the mentor; it never writes a skill estimate. Safe to call
 * again: it replaces the previous answers and reuses an unstarted diagnostic.
 *
 * If the diagnostic can't be written (model down, bad output), onboarding still counts as done and
 * assessmentId is null; Today offers to build it again.
 */
export async function completeOnboarding(
  userId: string,
  input: OnboardingInput,
): Promise<{ assessmentId: string | null }> {
  const now = new Date();
  const { trackIds, ...profile } = input;

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

export async function submitAssessmentAttempt(attemptId: string): Promise<void> {
  void attemptId;
  throw new NotImplementedError("submitAssessmentAttempt");
}

export async function refreshLearningPath(
  userId: string,
  learnerRequest?: string,
): Promise<{ pathId: string }> {
  void userId;
  void learnerRequest;
  throw new NotImplementedError("refreshLearningPath");
}

export async function assignNextMission(
  userId: string,
  cadence: "daily" | "weekly" = "daily",
): Promise<{ missionId: string }> {
  void userId;
  void cadence;
  throw new NotImplementedError("assignNextMission");
}

export async function submitMission(submissionId: string): Promise<{ evaluationId: string }> {
  void submissionId;
  throw new NotImplementedError("submitMission");
}
