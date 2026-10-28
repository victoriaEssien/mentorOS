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
  AI_MODEL_DEEP: z.string().min(1),

  // Reading GitHub submissions (optional: raises GitHub's limit from 60 reads an hour)
  GITHUB_TOKEN: z.string().optional(),

  // Email (Resend). Without a key, emails are printed to the server log instead of sent.
  RESEND_API_KEY: z.string().optional(),
  // Who emails come from, on a domain verified in Resend: "mentorOS <no-reply@mail.example.com>"
  EMAIL_FROM: z.string().optional(),
  // Development only: deliver every email here instead (e.g. delivered@resend.dev). Unset, they're logged.
  EMAIL_DEV_REDIRECT: z.string().optional(),
  // Vercel Cron sends this as a bearer token; the daily job refuses any request without it.
  CRON_SECRET: z.string().optional(),

  // Running learner code (Vercel Sandbox). The snapshot holds the toolchains; build it with
  // scripts/build-runner-snapshot.ts. On Vercel the sandbox authenticates with the deployment's
  // OIDC token; locally it needs a personal token and the team and project ids.
  CODE_RUNNER_SNAPSHOT_ID: z.string().optional(),
  VERCEL_TOKEN: z.string().optional(),
  VERCEL_TEAM_ID: z.string().optional(),
  VERCEL_PROJECT_ID: z.string().optional(),

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
