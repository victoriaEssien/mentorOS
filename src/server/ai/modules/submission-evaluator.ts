import "server-only";

import { NotImplementedError } from "@/lib/errors";

import type { LearnerContext } from "../context";
import { models } from "../provider";
import type { SubmissionEvaluation } from "../schemas";

/**
 * Submission Evaluator
 *
 * Evaluates submitted work against the mission's criteria (PRD §16).
 * Specific strengths and problems, the concept behind them, and the next action. No empty praise.
 */

export const PROMPT_VERSION = "v0";

const SYSTEM_PROMPT = `
TODO: Submission Evaluator system prompt.
`;

export type EvaluateSubmissionInput = {
  context: LearnerContext;
  mission: {
    title: string;
    objective: string;
    deliverable: string;
    evaluationCriteria: { key: string; label: string; description: string; maxScore: number }[];
  };
  submission: { content?: string; artifacts: { kind: string; url?: string; label?: string }[] };
  reflection?: Record<string, string | undefined>;
};

export async function evaluateSubmission(input: EvaluateSubmissionInput): Promise<SubmissionEvaluation> {
  void input;
  void models.smart;
  void SYSTEM_PROMPT;
  throw new NotImplementedError("submission-evaluator.evaluateSubmission");
}
