import { z } from "zod";

/**
 * Structured output of the Assessment Generator (PRD §9) and the Skill Evaluator.
 *
 * OpenAI's strict structured outputs reject optional properties, so "maybe absent" is expressed
 * as `.nullable()` and every field is always present.
 */

export const assessmentItemTypes = [
  "knowledge",
  "conceptual",
  "code",
  "debugging",
  "scenario",
  "problem_solving",
  "practical",
  "security",
  "data",
  "electronics",
] as const;

export const generatedAssessmentItemSchema = z.object({
  type: z.enum(assessmentItemTypes),
  skills: z
    .array(z.string())
    .min(1)
    .describe("Skill slugs this item probes, taken only from the provided list"),
  difficulty: z.number().int().min(1).max(5).describe("1 = recall, 5 = transfer to an unseen problem"),
  prompt: z.object({
    question: z.string().describe("The question or task, in plain language"),
    code: z.string().nullable().describe("Code, logs or data shown with the question, or null"),
    options: z
      .array(z.string())
      .nullable()
      .describe("Answer options for a multiple-choice item, or null when the answer is open"),
  }),
  rubric: z.object({
    expected: z.string().describe("What a strong answer contains"),
    gradingNotes: z
      .string()
      .describe("How to tell strong from partial from wrong, including the misconceptions to watch for"),
    correctOption: z
      .number()
      .int()
      .min(0)
      .nullable()
      .describe("Index of the correct option for multiple choice, otherwise null"),
  }),
  timeLimitSeconds: z.number().int().min(30).nullable().describe("Time limit, or null for no limit"),
});

export const generatedAssessmentSchema = z.object({
  title: z.string(),
  reason: z.string().describe("Why this assessment, shown to the learner"),
  items: z.array(generatedAssessmentItemSchema).min(1),
});

/** Structured output of the Skill Evaluator: per-response grading. */
export const responseGradeSchema = z.object({
  itemId: z.string(),
  score: z.number().min(0).max(1),
  skills: z.array(
    z.object({
      skill: z.string(),
      score: z.number().min(0).max(1),
      confidence: z.number().min(0).max(1),
      evidence: z.string(),
    }),
  ),
  misconception: z.string().nullable().describe("The misunderstanding the answer reveals, or null"),
});

export type GeneratedAssessment = z.infer<typeof generatedAssessmentSchema>;
export type GeneratedAssessmentItem = z.infer<typeof generatedAssessmentItemSchema>;
export type ResponseGrade = z.infer<typeof responseGradeSchema>;
