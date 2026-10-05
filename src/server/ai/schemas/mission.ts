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

/** Structured output of the Mission Generator (PRD §13, §14). Strict-mode safe: no optionals. */
export const generatedMissionSchema = z.object({
  type: z.enum(missionTypes),
  title: z.string().describe("What they'll make or do, in a few words"),
  objective: z.string().describe("One sentence: what they will be able to show when it's done"),
  reason: z.string().describe("Why this mission, now, for this learner"),
  estimatedMinutes: z.number().int().min(5),
  skills: z.array(z.string()).min(1).describe("Skill slugs practised; the first is the path item's skill"),
  requiredKnowledge: z.array(z.string()).describe("What they need to know first, as short phrases"),
  instructions: z.string().describe("Numbered steps, plain text, one per line"),
  deliverable: z.string().describe("Exactly what to hand in: a link, a repo, or a written explanation"),
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
    .describe("Only what this mission needs. Start here, not a reading list."),
});

export type GeneratedMission = z.infer<typeof generatedMissionSchema>;
