import { z } from "zod";

/**
 * Structured output of the Submission Evaluator (PRD §16, §25).
 * Validated before anything is written to the database.
 */
export const skillJudgementSchema = z.object({
  skill: z.string().describe("Skill slug"),
  score: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  evidence: z.string().describe("What in the submission supports this score"),
});

export const submissionEvaluationSchema = z.object({
  overallAssessment: z.enum(["strong", "pass", "partial", "fail"]),
  criteria: z.array(
    z.object({
      key: z.string(),
      score: z.number(),
      maxScore: z.number(),
      comment: z.string(),
    }),
  ),
  skills: z.array(skillJudgementSchema),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  why: z.string().describe("The underlying concept behind the main weakness"),
  recommendedNextStep: z.string(),
});

export type SkillJudgement = z.infer<typeof skillJudgementSchema>;
export type SubmissionEvaluation = z.infer<typeof submissionEvaluationSchema>;
