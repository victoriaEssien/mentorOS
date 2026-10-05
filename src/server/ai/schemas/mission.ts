import { z } from "zod";

/** Structured output of the Mission Generator (PRD §13, §14). Strict-mode safe: no optionals. */
export const generatedMissionSchema = z.object({
  type: z.enum([
    "learn",
    "practice",
    "build",
    "debug",
    "explain",
    "analyze",
    "design",
    "research",
    "teach",
    "challenge",
  ]),
  title: z.string(),
  objective: z.string(),
  reason: z.string().describe("Why this mission, now, for this learner"),
  estimatedMinutes: z.number().int().min(5),
  skills: z.array(z.string()).describe("Skill slugs practised"),
  requiredKnowledge: z.array(z.string()),
  instructions: z.string(),
  deliverable: z.string(),
  evaluationCriteria: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      description: z.string(),
      maxScore: z.number(),
    }),
  ),
  resources: z
    .array(
      z.object({
        title: z.string(),
        url: z.string().nullable().describe("A real, well-known URL, or null if unsure"),
        kind: z.string(),
        note: z.string().nullable(),
      }),
    )
    .max(3)
    .describe("Only what this mission needs. Start here, not a reading list."),
});

export type GeneratedMission = z.infer<typeof generatedMissionSchema>;
