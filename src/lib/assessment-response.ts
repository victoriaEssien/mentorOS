import { z } from "zod";

/**
 * What a learner hands in for one assessment item. "unknown" is an explicit "I don't know":
 * an honest gap is better evidence than a guess, so it gets its own answer rather than a blank.
 */
export const assessmentResponseSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("choice"), option: z.number().int().min(0).max(9) }),
  z.object({ kind: z.literal("text"), text: z.string().max(4000) }),
  z.object({ kind: z.literal("unknown") }),
]);

export type AssessmentResponse = z.infer<typeof assessmentResponseSchema>;

/** The question as the learner sees it. Rubrics never leave the server. */
export type ItemPrompt = { question: string; code: string | null; options: string[] | null };

export function isAnswered(response: AssessmentResponse | undefined): boolean {
  if (!response) return false;
  if (response.kind === "text") return response.text.trim().length > 0;
  return true;
}
