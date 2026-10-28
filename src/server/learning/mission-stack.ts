/**
 * Which stack a mission is built in (Part D). Two in three daily missions go deeper in the
 * learner's own stack, at production depth; every third explores something new. Weekly challenges
 * lean the other way: two in three explore, because a weekend is the time to pick up a tool. Pure,
 * so the mission generator is told the stack rather than choosing it.
 */

/** Used when onboarding didn't capture any technologies. */
export const DEFAULT_HOME_STACK = ["Next.js", "TypeScript", "Python", "PostgreSQL on Neon", "Auth.js"];

/** What exploring rotates through: tools strong engineers are expected to pick up. */
export const EXPLORE_POOL = [
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

export type StackPlan = { mode: "home"; technologies: string[] } | { mode: "explore"; candidates: string[] };

export function planStack({
  cadence,
  given,
  technologiesUsed,
}: {
  cadence: "daily" | "weekly";
  /** Missions of this cadence given before this one, any outcome. */
  given: number;
  technologiesUsed: readonly string[];
}): StackPlan {
  const third = given % 3 === 2;
  const explore = cadence === "daily" ? third : !third;
  if (!explore) {
    const home = technologiesUsed.map((t) => t.trim()).filter(Boolean);
    return { mode: "home", technologies: home.length > 0 ? home : DEFAULT_HOME_STACK };
  }

  // Each exploration moves three places along the pool, so consecutive ones offer different tools.
  const explorations = cadence === "daily" ? Math.floor(given / 3) : given - Math.floor(given / 3);
  const start = (explorations * 3) % EXPLORE_POOL.length;
  return {
    mode: "explore",
    candidates: [0, 1, 2].map((offset) => EXPLORE_POOL[(start + offset) % EXPLORE_POOL.length]!),
  };
}

/** How the mission page names its stack. */
export function stackLabel(plan: StackPlan, technology: string): string {
  return plan.mode === "explore" ? `Exploring: ${technology}` : `Your stack: ${technology}`;
}
