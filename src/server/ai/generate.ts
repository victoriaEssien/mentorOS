import "server-only";
import { generateText, NoObjectGeneratedError, NoOutputGeneratedError, Output } from "ai";
import type { z } from "zod";

import { callSettings, models, modelId, type Effort, type ModelTier } from "./provider";

/**
 * The one way modules produce structured output (AGENTS.md: every AI output that changes state is
 * structured). Validates against the Zod schema, records which model and prompt version produced
 * it so stored evaluations stay traceable, and turns schema failures into one error type.
 */

export type GenerationMeta = {
  module: string;
  model: string;
  promptVersion: string;
  durationMs: number;
  inputTokens: number | undefined;
  outputTokens: number | undefined;
};

export class AiGenerationError extends Error {
  constructor(
    readonly module: string,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(`${module}: ${message}`, options);
    this.name = "AiGenerationError";
  }
}

export async function generateStructured<SCHEMA extends z.ZodType>({
  module,
  promptVersion,
  tier,
  effort,
  instructions,
  prompt,
  schema,
  schemaName,
  schemaDescription,
  maxOutputTokens,
  timeoutMs = 180_000,
  abortSignal,
}: {
  /** Module name for logs and errors, e.g. "assessment-generator". */
  module: string;
  promptVersion: string;
  tier: ModelTier;
  effort?: Effort;
  instructions: string;
  prompt: string;
  schema: SCHEMA;
  schemaName: string;
  schemaDescription?: string;
  /**
   * Required: the most this call may generate, reasoning included. A stuck structured answer can
   * otherwise run to the model's limit, and a request abandoned on timeout may keep generating, and
   * billing, on the provider's side. Size it at a few times the module's normal output.
   */
  maxOutputTokens: number;
  timeoutMs?: number;
  abortSignal?: AbortSignal;
}): Promise<{ output: z.infer<SCHEMA>; meta: GenerationMeta }> {
  const started = performance.now();

  try {
    const result = await generateText({
      model: models[tier],
      instructions,
      prompt,
      output: Output.object({ schema, name: schemaName, description: schemaDescription }),
      maxRetries: 2,
      maxOutputTokens,
      timeout: timeoutMs,
      abortSignal,
      ...callSettings(tier, effort),
    });

    const output = result.output as z.infer<SCHEMA>;
    const meta: GenerationMeta = {
      module,
      model: modelId(tier),
      promptVersion,
      durationMs: Math.round(performance.now() - started),
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
    };
    console.info(JSON.stringify({ event: "ai.generation", ...meta }));
    return { output, meta };
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error) || NoOutputGeneratedError.isInstance(error)) {
      console.error(
        JSON.stringify({
          event: "ai.generation_failed",
          module,
          promptVersion,
          durationMs: Math.round(performance.now() - started),
          reason: error.message,
        }),
      );
      throw new AiGenerationError(module, "the model's answer didn't match the expected structure", {
        cause: error,
      });
    }
    throw error;
  }
}
