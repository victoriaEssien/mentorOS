import "server-only";
import { z } from "zod";

/**
 * Server environment, validated once at import time.
 * Add a variable here before reading it anywhere else, and mirror it in .env.example.
 */
const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Database (Neon)
  DATABASE_URL: z.url(),

  // Auth (Better Auth)
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // AI (OpenAI via the Vercel AI SDK)
  OPENAI_API_KEY: z.string().min(1),
  AI_MODEL_FAST: z.string().min(1),
  AI_MODEL_SMART: z.string().min(1),

  // Reading GitHub submissions (optional: raises GitHub's limit from 60 reads an hour)
  GITHUB_TOKEN: z.string().optional(),

  // Observability
  SENTRY_DSN: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
});

const parsed = serverSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", z.treeifyError(parsed.error));
  throw new Error("Invalid environment variables. Check .env.local against .env.example.");
}

export const env = parsed.data;
