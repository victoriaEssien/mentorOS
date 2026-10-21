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

/**
 * Structured output of the Skill Evaluator for one written answer. Scores are the quality of this
 * answer against the rubric; how much that says about ability, given the item's difficulty, is
 * decided in code (src/server/learning/grading.ts).
 */
export const answerGradeSchema = z.object({
  score: z
    .number()
    .min(0)
    .max(1)
    .describe("How much of a strong answer this is: 1 = everything the rubric expects, 0 = wrong or empty"),
  skills: z
    .array(
      z.object({
        skill: z.string().describe("Skill slug, only from the item's skills"),
        score: z.number().min(0).max(1).describe("How well the answer shows this skill"),
        confidence: z
          .number()
          .min(0)
          .max(1)
          .describe("How clearly this one answer shows the learner's level on this skill"),
        evidence: z.string().describe("One sentence: what in the answer supports this score"),
      }),
    )
    .min(1),
  misconception: z.string().nullable().describe("The specific misunderstanding the answer reveals, or null"),
  feedback: z
    .string()
    .describe("Two or three sentences to the learner: what the answer got right, what it missed, and why"),
});

export type GeneratedAssessment = z.infer<typeof generatedAssessmentSchema>;
export type GeneratedAssessmentItem = z.infer<typeof generatedAssessmentItemSchema>;
export type AnswerGrade = z.infer<typeof answerGradeSchema>;
