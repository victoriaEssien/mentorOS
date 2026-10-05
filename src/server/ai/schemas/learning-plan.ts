import { z } from "zod";

/** Structured output of the Learning Planner (PRD §12, §17). Strict-mode safe: no optionals. */
export const learningPlanSchema = z.object({
  focusSummary: z.string(),
  items: z
    .array(
      z.object({
        skill: z.string().nullable().describe("Skill slug, if the item maps to one, otherwise null"),
        title: z.string(),
        reason: z.string().describe("Why are you learning this? Grounded in evidence."),
      }),
    )
    .min(1),
  /** When the learner asked to skip ahead and the planner says "not yet" (behaviour 17). */
  deferred: z.array(z.object({ request: z.string(), reason: z.string(), unlockWhen: z.string() })),
});

export type LearningPlan = z.infer<typeof learningPlanSchema>;
