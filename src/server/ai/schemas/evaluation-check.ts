import { z } from "zod";

/**
 * Structured output of the Evaluation Checker: the claims in a hand-in's feedback that don't hold,
 * each with its fix. Empty when everything holds, which is the usual case.
 *
 * No numeric bounds (see submission-evaluation.ts): scores are clamped in code (applyCorrections).
 */
export const evaluationCheckSchema = z.object({
  corrections: z.array(
    z.object({
      part: z
        .enum(["criterion", "strength", "weakness", "why", "nextStep"])
        .describe("Which part of the feedback the wrong claim is in"),
      criterion: z.string().nullable().describe("The criterion's key when part is criterion, otherwise null"),
      position: z
        .number()
        .nullable()
        .describe("Which strength or weakness, counting from 1, when part is one of those, otherwise null"),
      wrongClaim: z.string().describe("The claim that doesn't hold, quoted or closely paraphrased"),
      reason: z.string().describe("Why it doesn't hold: what the hand-in shows, or what is actually true"),
      fixed: z
        .string()
        .describe(
          "The whole replacement text for that part, same voice and length, keeping what was right. Empty to drop a strength or weakness.",
        ),
      score: z
        .number()
        .nullable()
        .describe(
          "For a criterion whose marks the wrong claim changed: its corrected score, on the same scale as its current one. Otherwise null.",
        ),
    }),
  ),
});

export type EvaluationCheck = z.infer<typeof evaluationCheckSchema>;
export type EvaluationCorrection = EvaluationCheck["corrections"][number];
