import "server-only";

import { NotImplementedError } from "@/lib/errors";

import type { LearnerContext } from "../context";
import { models } from "../provider";
import type { GeneratedAssessment } from "../schemas";

/**
 * Assessment Generator
 *
 * Creates diagnostic questions, knowledge checks, surprise checks and reassessments (PRD §9, §18).
 * Mixes item types and difficulty so the result separates recognising an explanation from applying it.
 */

export const PROMPT_VERSION = "v0";

const SYSTEM_PROMPT = `
TODO: Assessment Generator system prompt.
`;

export type GenerateAssessmentInput = {
  context: LearnerContext;
  kind: "diagnostic" | "knowledge_check" | "surprise" | "reassessment";
  targetSkills: string[];
  /** For surprise checks: do not name the concept being tested (behaviour 7). */
  concealTopic?: boolean;
};

export async function generateAssessment(input: GenerateAssessmentInput): Promise<GeneratedAssessment> {
  void input;
  void models.smart;
  void SYSTEM_PROMPT;
  throw new NotImplementedError("assessment-generator.generateAssessment");
}
