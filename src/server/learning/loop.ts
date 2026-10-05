import "server-only";

import { NotImplementedError } from "@/lib/errors";

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

export async function completeOnboarding(userId: string): Promise<{ assessmentId: string }> {
  void userId;
  throw new NotImplementedError("completeOnboarding");
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
