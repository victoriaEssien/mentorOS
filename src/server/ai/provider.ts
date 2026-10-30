import "server-only";
import { openai } from "@ai-sdk/openai";

import { env } from "@/lib/env";

/**
 * The only place that knows which provider and model ids are in use (PRD §24).
 * Modules ask for a tier, never a model id. To add a provider later, change this file only.
 *
 * - fast:  conversational turns and short generations (mentor chat, tutor, review questions,
 *          follow-up checks)
 * - smart: writing and judging that change learner state (concepts, grading, projects, reviews)
 * - deep:  the strongest model, for work where it clearly beats smart. Nothing needs it right now.
 */
export const models = {
  fast: openai(env.AI_MODEL_FAST),
  smart: openai(env.AI_MODEL_SMART),
  deep: openai(env.AI_MODEL_DEEP),
} as const;

export type ModelTier = keyof typeof models;

const MODEL_IDS: Record<ModelTier, string> = {
  fast: env.AI_MODEL_FAST,
  smart: env.AI_MODEL_SMART,
  deep: env.AI_MODEL_DEEP,
};

export const modelId = (tier: ModelTier) => MODEL_IDS[tier];

/** How hard the model thinks before answering. Higher is slower and costs more. */
export type Effort = "low" | "medium" | "high";

const DEFAULT_EFFORT: Record<ModelTier, Effort> = { fast: "low", smart: "medium", deep: "medium" };

/**
 * Provider-specific call settings for a tier. Reasoning summaries are switched off: no module
 * reads them, and they add latency.
 */
export function callSettings(tier: ModelTier, effort: Effort = DEFAULT_EFFORT[tier]) {
  return {
    providerOptions: {
      openai: { reasoningEffort: effort, reasoningSummary: null },
    },
  };
}
