/**
 * Which stack a project is built in. Two in three go deeper in the learner's own stack, at
 * production depth; every third explores something new, from the side of the stack the theme is
 * about. Pure, so the Project Writer is told the stack rather than choosing it.
 */

import type { Theme } from "@/lib/themes";

/** Used when onboarding didn't capture any technologies. */
export const DEFAULT_HOME_STACK = ["Next.js", "TypeScript", "Python", "PostgreSQL on Neon", "Auth.js"];

/** What backend themes explore: tools strong engineers are expected to pick up. */
export const BACKEND_POOL = [
  "Go",
  "Redis",
  "Docker and Docker Compose",
  "Rust",
  "a message queue (RabbitMQ or Amazon SQS)",
  "pgvector for embeddings",
  "an LLM API with structured output",
  "WebSockets",
  "gRPC",
  "Kafka",
  "Cloudflare Workers",
  "SQLite",
];

/** What frontend themes explore: frameworks with a different model from React's. */
export const FRONTEND_POOL = ["Vue", "Svelte (SvelteKit)", "Angular", "SolidJS", "Astro", "htmx"];

/** Full-stack themes alternate between the two, so each offer mixes both sides. */
const FULL_STACK_POOL = Array.from({ length: Math.max(BACKEND_POOL.length, FRONTEND_POOL.length) }, (_, i) => [
  FRONTEND_POOL[i],
  BACKEND_POOL[i],
]).flatMap((pair) => pair.filter((tool): tool is string => tool !== undefined));

const POOLS: Record<Theme["side"], string[]> = {
  backend: BACKEND_POOL,
  frontend: FRONTEND_POOL,
  "full stack": FULL_STACK_POOL,
};

export type StackPlan = { mode: "home"; technologies: string[] } | { mode: "explore"; candidates: string[] };

// Words too general to say two tools are the same one ("REST API" is not "an LLM API").
const FILLER = new Set(["a", "an", "and", "or", "for", "on", "with", "the", "api", "apis", "js"]);
const words = (name: string) =>
  name
    .toLowerCase()
    .split(/[^a-z0-9+#]+/)
    .filter((word) => word.length > 0 && !FILLER.has(word));

export function planStack({
  given,
  technologiesUsed,
  side,
}: {
  /** Projects given before this one, any outcome. */
  given: number;
  technologiesUsed: readonly string[];
  /** The theme's side of the stack, which decides what exploring offers. */
  side: Theme["side"];
}): StackPlan {
  const home = technologiesUsed.map((t) => t.trim()).filter(Boolean);
  if (given % 3 !== 2) {
    return { mode: "home", technologies: home.length > 0 ? home : DEFAULT_HOME_STACK };
  }

  // Exploring means something they don't already use; if that leaves too little, the whole pool.
  const known = new Set(home.flatMap(words));
  const fresh = POOLS[side].filter((tool) => !words(tool).some((word) => known.has(word)));
  const pool = fresh.length >= 3 ? fresh : POOLS[side];

  // Each exploration moves three places along the pool, so consecutive ones offer different tools.
  const start = (Math.floor(given / 3) * 3) % pool.length;
  return { mode: "explore", candidates: [0, 1, 2].map((offset) => pool[(start + offset) % pool.length]!) };
}

/** How the project page names its stack. */
export function stackLabel(plan: StackPlan, technology: string): string {
  return plan.mode === "explore" ? `Exploring: ${technology}` : `Your stack: ${technology}`;
}
