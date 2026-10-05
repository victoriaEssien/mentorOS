import "server-only";

import { NotImplementedError } from "@/lib/errors";

import type { LearnerContext } from "../context";
import { models } from "../provider";

/**
 * Tutor
 *
 * Explains concepts and answers questions at the learner's level (PRD §21).
 * Invoked by the mentor as a tool, or directly for "explain this like I'm a beginner".
 */

export const PROMPT_VERSION = "v0";

const SYSTEM_PROMPT = `
TODO: Tutor system prompt.
`;

export type ExplainConceptInput = {
  context: LearnerContext;
  question: string;
  level?: "beginner" | "intermediate" | "advanced";
};

export async function explainConcept(input: ExplainConceptInput): Promise<string> {
  void input;
  void models.fast;
  void SYSTEM_PROMPT;
  throw new NotImplementedError("tutor.explainConcept");
}
