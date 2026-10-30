import { z } from "zod";

export const missionTypes = [
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
] as const;

/** Structured output of the Project Writer (the mission generator). Strict-mode safe: no optionals. */
export const generatedMissionSchema = z.object({
  type: z.enum(missionTypes),
  title: z.string().describe("What they'll make or do, in a few words"),
  objective: z.string().describe("One sentence: what they will be able to show when it's done"),
  scenario: z
    .string()
    .describe(
      "Two or three sentences: who needs this, what's missing or broken, and the constraint that makes it interesting",
    ),
  technology: z
    .string()
    .describe("The main technology it's built with, e.g. 'Next.js and Postgres' or 'Redis'"),
  reason: z.string().describe("Why this project, now, and why this size"),
  durationWeeks: z
    .number()
    .int()
    .min(1)
    .max(4)
    .describe("Weeks it honestly needs: 1 for most projects, 2 to 4 only when the build genuinely needs it"),
  estimatedMinutes: z.number().int().min(5).describe("Total effort in minutes"),
  requiredKnowledge: z.array(z.string()).describe("What they need to know first, as short phrases"),
  instructions: z.string().describe("Numbered steps, plain text, one per line"),
  deliverable: z.string().describe("Exactly what to hand in: a link, a repo, or a written explanation"),
  acceptanceCriteria: z
    .array(z.string())
    .min(3)
    .max(7)
    .describe(
      "Checkable statements of done: behaviour, edge cases handled, a performance or reliability target, tests that exist",
    ),
  stretchGoal: z.string().nullable().describe("One harder extension for when they finish early, or null"),
  evaluationCriteria: z
    .array(
      z.object({
        key: z.string().describe("Short identifier, e.g. correctness"),
        label: z.string(),
        description: z.string().describe("What full marks looks like"),
        maxScore: z.number().describe("Out of 10"),
      }),
    )
    .min(2)
    .max(5),
  resources: z
    .array(
      z.object({
        title: z.string(),
        url: z.string().nullable().describe("A real, well-known URL, or null if unsure"),
        kind: z.string().describe("docs, article, video or tool"),
        note: z.string().nullable(),
      }),
    )
    .max(3)
    .describe("Only what this project needs. Start here, not a reading list."),
});

export type GeneratedMission = z.infer<typeof generatedMissionSchema>;
