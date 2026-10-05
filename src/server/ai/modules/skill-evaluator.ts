import "server-only";

import { NotImplementedError } from "@/lib/errors";

import type { LearnerContext } from "../context";
import { models } from "../provider";
import type { ResponseGrade } from "../schemas";

/**
 * Skill Evaluator
 *
 * Interprets assessment responses as skill evidence (PRD §10).
 * Grades each response against its rubric. Does not write to the database.
 */

export const PROMPT_VERSION = "v0";

const SYSTEM_PROMPT = `
TODO: Skill Evaluator system prompt.
`;

export type GradeAssessmentInput = {
  context: LearnerContext;
  attemptId: string;
  responses: { itemId: string; prompt: unknown; rubric: unknown; response: unknown; hintsUsed: number }[];
};

export async function gradeAssessmentResponses(input: GradeAssessmentInput): Promise<ResponseGrade[]> {
  void input;
  void models.smart;
  void SYSTEM_PROMPT;
  throw new NotImplementedError("skill-evaluator.gradeAssessmentResponses");
}
