import "server-only";

import { NotImplementedError } from "@/lib/errors";

import type { LearnerContext } from "../context";
import { models } from "../provider";
import type { GeneratedMission } from "../schemas";

/**
 * Mission Generator
 *
 * Creates practical missions and weekly challenges (PRD §13, §14, §19).
 * Prefers build/debug/design over read. Can combine skills across tracks (behaviour 12).
 */

export const PROMPT_VERSION = "v0";

const SYSTEM_PROMPT = `
TODO: Mission Generator system prompt.
`;

export type GenerateMissionInput = {
  context: LearnerContext;
  cadence: "daily" | "weekly";
  pathItem: { title: string; reason: string; skill?: string } | null;
  targetDifficulty: number;
};

export async function generateMission(input: GenerateMissionInput): Promise<GeneratedMission> {
  void input;
  void models.smart;
  void SYSTEM_PROMPT;
  throw new NotImplementedError("mission-generator.generateMission");
}
