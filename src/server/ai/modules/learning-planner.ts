import "server-only";

import { NotImplementedError } from "@/lib/errors";

import type { LearnerContext } from "../context";
import { models } from "../provider";
import type { LearningPlan } from "../schemas";

/**
 * Learning Planner
 *
 * Decides what the learner should learn next and why (PRD §12, §17).
 * Steps backwards on repeated failure, raises difficulty on repeated success, and can refuse to skip ahead.
 */

export const PROMPT_VERSION = "v0";

const SYSTEM_PROMPT = `
TODO: Learning Planner system prompt.
`;

export type PlanLearningPathInput = {
  context: LearnerContext;
  /** e.g. "I want to get better at backend engineering" or "Can we move on to Kubernetes?" */
  learnerRequest?: string;
  /** Skills the deterministic readiness check says are blocked, with missing prerequisites. */
  blocked: { skill: string; missing: string[] }[];
};

export async function planLearningPath(input: PlanLearningPathInput): Promise<LearningPlan> {
  void input;
  void models.smart;
  void SYSTEM_PROMPT;
  throw new NotImplementedError("learning-planner.planLearningPath");
}
