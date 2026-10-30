import { z } from "zod";

/**
 * Structured outputs for concepts: writing one (once, then stored), grading an explanation against
 * its checklist, asking about it again in a fresh way, and checking a follow-up answer. Strict-mode
 * safe: no optionals.
 */

export const writtenConceptSchema = z.object({
  ask: z
    .string()
    .describe(
      "What to explain, as a direct request to the learner: what it is, why it exists and how it works",
    ),
  checklist: z
    .array(
      z.object({
        id: z.string().describe("Short kebab-case id, e.g. 'auth-vs-capture'"),
        point: z
          .string()
          .describe("One key point a strong explanation must make, stated as the mechanism, not a keyword"),
      }),
    )
    .min(4)
    .max(7),
  reference: z
    .string()
    .describe("A reference explanation, 180 to 320 words, plain prose with a small concrete example"),
  sources: z
    .array(
      z.object({
        title: z.string(),
        url: z.string().nullable().describe("Exact address, or null if you aren't sure of it"),
      }),
    )
    .max(3)
    .describe("Official documentation for the details, only from the sources you're given or sure of"),
});

export type WrittenConcept = z.infer<typeof writtenConceptSchema>;

export const conceptGradeSchema = z.object({
  points: z
    .array(
      z.object({
        id: z.string().describe("The checklist point's id"),
        status: z
          .enum(["hit", "missed", "wrong"])
          .describe("hit: explained how it works; missed: absent or only named; wrong: stated incorrectly"),
        note: z.string().describe("One sentence on what in their explanation decided this"),
      }),
    )
    .min(1),
  feedback: z
    .string()
    .describe("Two or three sentences, as 'you', on the biggest gap and the idea behind it"),
  followUp: z
    .string()
    .describe("One question that tests whether they understand the mechanism rather than the words"),
});

export type ConceptGrade = z.infer<typeof conceptGradeSchema>;

export const reviewQuestionSchema = z.object({
  question: z
    .string()
    .describe("A fresh way to ask about the concept: a concrete scenario they have to reason through"),
});

export const followUpCheckSchema = z.object({
  result: z.enum(["right", "partly", "wrong"]),
  note: z.string().describe("One or two sentences, as 'you': what's right, and what the full answer is"),
});
