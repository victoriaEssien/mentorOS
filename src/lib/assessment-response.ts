import { z } from "zod";

import type { CodeLanguage, TestCase } from "./code-languages";

/**
 * What a learner hands in for one assessment item. "unknown" is an explicit "I don't know":
 * an honest gap is better evidence than a guess, so it gets its own answer rather than a blank.
 */
export const assessmentResponseSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("choice"), option: z.number().int().min(0).max(9) }),
  z.object({ kind: z.literal("text"), text: z.string().max(4000) }),
  // A program for the daily set, with their approach and its complexity in a few sentences.
  z.object({ kind: z.literal("code"), code: z.string().max(20_000), explanation: z.string().max(4000) }),
  z.object({ kind: z.literal("unknown") }),
]);

export type AssessmentResponse = z.infer<typeof assessmentResponseSchema>;

/**
 * The question as the learner sees it. Rubrics never leave the server. Daily set questions add
 * their title, language and the examples their code is run against.
 */
export type ItemPrompt = {
  question: string;
  code: string | null;
  options: string[] | null;
  title?: string;
  language?: CodeLanguage;
  examples?: TestCase[];
};

export function isAnswered(response: AssessmentResponse | undefined): boolean {
  if (!response) return false;
  if (response.kind === "text") return response.text.trim().length > 0;
  if (response.kind === "code") return response.code.trim().length > 0;
  return true;
}
