import "server-only";
import { tool } from "ai";
import { z } from "zod";

import type { LearnerContext } from "@/server/ai/context";
import { explainConcept } from "@/server/ai/modules/tutor";

/**
 * Every tool call carries a reason the learner sees as the step runs ("Explaining webhooks, because
 * you asked how they retry"), so the mentor's work is visible rather than a spinner.
 */
const why = z
  .string()
  .describe(
    "Shown to the learner under this step while it runs: why you're doing it, a few words starting lowercase, e.g. 'you asked how webhooks retry'",
  );

/**
 * What the mentor can do, bound to one learner's record. The mentor never writes learner state on
 * its own (AGENTS.md).
 */
export function mentorTools(context: LearnerContext) {
  return {
    explain_concept: tool({
      description:
        "Explain a concept, or answer a how or why question, at the learner's level. The explanation is shown to them as its own card.",
      inputSchema: z.object({
        question: z.string().describe("What to explain, in the learner's terms"),
        level: z.enum(["beginner", "intermediate", "advanced"]),
        why,
      }),
      execute: async ({ question, level }) => ({
        explanation: await explainConcept({ context, question, level }),
      }),
    }),
  };
}

export type MentorTools = ReturnType<typeof mentorTools>;
