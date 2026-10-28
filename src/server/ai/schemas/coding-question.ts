import { z } from "zod";

/**
 * Structured output of the Coding Question Writer: one question of today's coding set. Programs
 * read stdin and write stdout, so the same tests run in every language. Strict structured outputs
 * reject optional properties, so "not for this kind" is null or an empty list.
 */

const testCaseSchema = z.object({
  input: z.string().describe("Exactly what the program reads on stdin, newlines included"),
  output: z.string().describe("Exactly what a correct program prints"),
});

export const generatedCodingQuestionSchema = z.object({
  title: z.string().describe("A short title, in sentence case"),
  question: z
    .string()
    .describe(
      "The task in plain language (markdown allowed). For programs: what to compute, the exact input format and the exact output format",
    ),
  code: z
    .string()
    .describe(
      "Starter code for a program to write, the buggy program to fix, or the program to explain or predict. Always a complete file",
    ),
  solution: z
    .string()
    .nullable()
    .describe("A complete, correct program for a question with tests, or null for explain and predict"),
  examples: z
    .array(testCaseSchema)
    .describe("2 or 3 examples shown to the learner, or empty for explain and predict"),
  tests: z
    .array(testCaseSchema)
    .describe("6 to 10 hidden tests covering edge cases, or empty for explain and predict"),
  expected: z
    .string()
    .describe("What a strong answer contains: the approach, the key idea, and the time and space complexity"),
  gradingNotes: z
    .string()
    .describe("How to tell strong from partial from wrong, and the misconceptions to watch for"),
});

export type GeneratedCodingQuestion = z.infer<typeof generatedCodingQuestionSchema>;
