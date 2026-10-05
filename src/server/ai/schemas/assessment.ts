import { z } from "zod";

/** Structured output of the Assessment Generator (PRD §9). */
export const generatedAssessmentItemSchema = z.object({
  type: z.enum([
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
  ]),
  skills: z.array(z.string()).describe("Skill slugs this item probes"),
  difficulty: z.number().int().min(1).max(5).describe("1 = recall, 5 = transfer to an unseen problem"),
  prompt: z.object({
    question: z.string(),
    code: z.string().optional(),
    options: z.array(z.string()).optional(),
  }),
  rubric: z.object({
    expected: z.string(),
    gradingNotes: z.string(),
  }),
  timeLimitSeconds: z.number().int().positive().optional(),
});

export const generatedAssessmentSchema = z.object({
  title: z.string(),
  reason: z.string(),
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
  misconception: z.string().optional(),
});

export type GeneratedAssessment = z.infer<typeof generatedAssessmentSchema>;
export type ResponseGrade = z.infer<typeof responseGradeSchema>;
