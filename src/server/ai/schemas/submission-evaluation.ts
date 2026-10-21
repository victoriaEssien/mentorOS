import { z } from "zod";

/**
 * Structured output of the Submission Evaluator (PRD §16, §25).
 * Validated before anything is written to the database. The overall verdict is not asked for:
 * it is computed in code from the criterion scores, so it can't disagree with them.
 *
 * No numeric bounds or list limits here: with them, strict decoding stalled mid-answer on real
 * submissions (every request timed out; the same schema without them answered in seconds).
 * Ranges are stated in the descriptions and enforced in code (tidyEvaluation, toEvidenceRows).
 */
export const skillJudgementSchema = z.object({
  skill: z.string().describe("Skill slug"),
  score: z.number().describe("0 to 1"),
  confidence: z.number().describe("0 to 1"),
  evidence: z.string().describe("What in the submission supports this score"),
});

export const submissionEvaluationSchema = z.object({
  criteria: z.array(
    z.object({
      key: z.string().describe("The criterion's key, exactly as given"),
      score: z.number().describe("0 to 10"),
      comment: z.string().describe("One or two sentences: what earned the score and what cost points"),
    }),
  ),
  skills: z.array(skillJudgementSchema),
  strengths: z.array(z.string()).describe("Up to four specific things done well, each pointing at the work"),
  weaknesses: z.array(z.string()).describe("Up to four specific problems, each one something they can fix"),
  why: z.string().describe("The underlying concept behind the main weakness"),
  recommendedNextStep: z.string().describe("One concrete next action"),
  unseen: z.string().nullable().describe("What the deliverable asked for that you couldn't see, or null"),
});

export type SkillJudgement = z.infer<typeof skillJudgementSchema>;
export type SubmissionEvaluation = z.infer<typeof submissionEvaluationSchema>;
