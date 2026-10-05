import "server-only";
import { openai } from "@ai-sdk/openai";

import { env } from "@/lib/env";

/**
 * The only place that knows which provider and model ids are in use (PRD §24).
 * Modules ask for a tier, never a model id. To add a provider later, change this file only.
 *
 * - fast:  conversational turns, hints, short generations (mentor chat, tutor)
 * - smart: anything that changes learner state (evaluation, planning, assessment generation)
 */
export const models = {
  fast: openai(env.AI_MODEL_FAST),
  smart: openai(env.AI_MODEL_SMART),
} as const;

export type ModelTier = keyof typeof models;

export const modelId = (tier: ModelTier) => (tier === "fast" ? env.AI_MODEL_FAST : env.AI_MODEL_SMART);
