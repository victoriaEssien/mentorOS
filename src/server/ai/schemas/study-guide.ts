import { z } from "zod";

/** Structured output of the Study Guide Writer: how to study one path step. Strict-mode safe. */
export const generatedStudyGuideSchema = z.object({
  summary: z.string().describe("One or two sentences, as you: what this step is about and what it unlocks"),
  learn: z
    .array(
      z.object({
        idea: z.string().describe("One idea to understand, stated plainly"),
        why: z.string().describe("Why it matters, in one sentence"),
      }),
    )
    .min(2)
    .max(6)
    .describe("The ideas to understand, in the order to learn them"),
  read: z
    .array(
      z.object({
        title: z.string(),
        url: z.string().nullable().describe("Exact address, or null if you aren't sure of it"),
        kind: z.string().describe("docs, article, book chapter, video or tool"),
        note: z.string().nullable().describe("What to read in it and what to skip, or null"),
      }),
    )
    .min(1)
    .max(4),
  practise: z
    .array(z.string())
    .min(2)
    .max(5)
    .describe("Small exercises to try before the mission, easiest first, each one or two sentences"),
  pitfalls: z
    .array(z.string())
    .max(4)
    .describe("Mistakes people make here, especially ones this learner has made"),
  checkpoints: z
    .array(z.string())
    .min(2)
    .max(4)
    .describe(
      "How they'll know it has landed, each starting with a verb: 'Explain...', 'Write...', 'Predict...'",
    ),
});

export type GeneratedStudyGuide = z.infer<typeof generatedStudyGuideSchema>;
