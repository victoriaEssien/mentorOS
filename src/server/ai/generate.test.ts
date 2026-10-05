import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { AiGenerationError, generateStructured } from "./generate";

const reply = vi.hoisted(() => ({ text: "" }));

vi.mock("./provider", async () => {
  const { MockLanguageModelV4 } = await import("ai/test");
  const model = new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [{ type: "text", text: reply.text }],
      finishReason: { unified: "stop", raw: undefined },
      usage: {
        inputTokens: { total: 12, noCache: 12, cacheRead: undefined, cacheWrite: undefined },
        outputTokens: { total: 34, text: 34, reasoning: undefined },
      },
      warnings: [],
    }),
  });
  return {
    models: { fast: model, smart: model },
    modelId: (tier: string) => `mock-${tier}`,
    callSettings: () => ({}),
  };
});

vi.spyOn(console, "info").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});

const schema = z.object({ title: z.string(), items: z.array(z.number()) });

const call = () =>
  generateStructured({
    module: "test-module",
    promptVersion: "v9",
    tier: "smart",
    instructions: "Return a title and numbers.",
    prompt: "Go.",
    schema,
    schemaName: "Thing",
  });

describe("generateStructured", () => {
  it("returns validated output with the model and prompt version that produced it", async () => {
    reply.text = JSON.stringify({ title: "Diagnostic", items: [1, 2] });
    const { output, meta } = await call();

    expect(output).toEqual({ title: "Diagnostic", items: [1, 2] });
    expect(meta).toMatchObject({
      module: "test-module",
      model: "mock-smart",
      promptVersion: "v9",
      inputTokens: 12,
      outputTokens: 34,
    });
  });

  it("turns output that breaks the schema into an AiGenerationError", async () => {
    reply.text = JSON.stringify({ title: 42 });
    await expect(call()).rejects.toBeInstanceOf(AiGenerationError);
  });

  it("turns unparseable output into an AiGenerationError", async () => {
    reply.text = "not json at all";
    await expect(call()).rejects.toThrow(/test-module/);
  });
});
