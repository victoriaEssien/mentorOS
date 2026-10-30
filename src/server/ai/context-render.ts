import type { Outcome } from "@/server/learning/difficulty";

/**
 * Everything an AI module is allowed to know about a learner (PRD §21), and how it is written into
 * a prompt. Assembled from the database on every call (context.ts); the model never remembers
 * anything on its own. Pure, so prompts are reproducible and testable.
 */

export type MentorTone = "direct" | "balanced" | "supportive";
export type Momentum = "struggling" | "steady" | "cruising";

/** A mission's points from its latest evaluation, per criterion and in total. */
export type MissionPoints = {
  scored: number;
  available: number;
  criteria: { key: string; score: number; max: number }[];
};

/**
 * Points per criterion from a stored submission evaluation, against the mission's own criteria
 * (which carry the maximums). Null when either side is missing; a criterion the evaluation
 * skipped scores zero, as it did when the evaluation was graded.
 */
export function missionPoints(
  result: unknown,
  criteria: readonly { key: string; maxScore: number }[],
): MissionPoints | null {
  const graded = (result as { criteria?: unknown } | null)?.criteria;
  if (!Array.isArray(graded) || criteria.length === 0) return null;
  const scoreByKey = new Map<string, number>();
  for (const entry of graded) {
    if (entry && typeof entry.key === "string" && typeof entry.score === "number") {
      scoreByKey.set(entry.key, entry.score);
    }
  }
  const rows = criteria.map((criterion) => ({
    key: criterion.key,
    score: scoreByKey.get(criterion.key) ?? 0,
    max: criterion.maxScore,
  }));
  return {
    scored: rows.reduce((sum, row) => sum + row.score, 0),
    available: rows.reduce((sum, row) => sum + row.max, 0),
    criteria: rows,
  };
}

export type LearnerContext = {
  userId: string;
  name: string;
  goals: string[];
  background: {
    currentRole: string | null;
    yearsExperience: number | null;
    technologiesUsed: string[];
    weeklyLearningHours: number | null;
    learningStyle: string | null;
    previousLearning: string | null;
    existingProjects: string | null;
  };
  tone: { preference: MentorTone; momentum: Momentum };
  /** This week's theme, if one is running. */
  currentTheme: { title: string; week: number; weeks: number } | null;
  currentProject: {
    id: string;
    title: string;
    stack: string | null;
    objective: string;
    status: string;
    dueAt: string | null;
  } | null;
  recentProjects: {
    title: string;
    outcome: Outcome | null;
    /** Why it has no outcome: skipped, or ran out of time before it was handed in. */
    ended?: "skipped" | "expired" | null;
    completedAt: string | null;
    /** Where the marks went in its latest evaluation, so "why did I get 16/40?" has an answer. */
    points: MissionPoints | null;
  }[];
  /** Recent concept explanations, newest first: the verdict, or that it wasn't explained. */
  recentConcepts: { title: string; day: string; verdict: "solid" | "partly" | "not_yet" | null }[];
  /** Weaknesses from project reviews and points got wrong in concept explanations, newest first. */
  recentMistakes: string[];
};

/**
 * Recent form, from the latest outcomes (most recent first). Shapes delivery only:
 * steadier when struggling, more push when cruising.
 */
export function deriveMomentum(outcomes: readonly Outcome[]): Momentum {
  const recent = outcomes.slice(0, 4);
  if (recent.length === 0) return "steady";

  const [last, previous] = recent;
  if (last === "fail" && previous === "fail") return "struggling";
  if (recent.filter((outcome) => outcome === "fail" || outcome === "partial").length >= 3)
    return "struggling";

  const lastThree = recent.slice(0, 3);
  if (
    lastThree.length === 3 &&
    lastThree.every((outcome) => outcome === "strong" || outcome === "pass") &&
    lastThree.filter((outcome) => outcome === "strong").length >= 2
  ) {
    return "cruising";
  }

  return "steady";
}

const TONE_GUIDANCE: Record<MentorTone, string> = {
  direct: "Be blunt and brief. No cushioning, no pleasantries.",
  balanced: "Be direct and specific. Warm, never vague.",
  supportive: "Lead with what worked, then the problems, kindly and clearly.",
};

const MOMENTUM_GUIDANCE: Record<Momentum, string | null> = {
  struggling: "They have struggled recently: be steadier and more encouraging in how you say things.",
  steady: null,
  cruising: "They are cruising: push harder and raise the bar.",
};

const LIMITS = { projects: 5, concepts: 7, mistakes: 8 };

/** Compact text rendering of the context for prompts. Bounded lists keep token use predictable. */
export function renderLearnerContext(context: LearnerContext): string {
  const lines: string[] = [];
  const background = context.background;

  lines.push("LEARNER");
  lines.push(`Name: ${context.name}`);
  if (context.goals.length > 0) lines.push(`Goals: ${context.goals.join("; ")}`);

  const facts = [
    background.currentRole && `role: ${background.currentRole}`,
    background.yearsExperience !== null && `${background.yearsExperience} years of experience`,
    background.technologiesUsed.length > 0 && `has used: ${background.technologiesUsed.join(", ")}`,
    background.weeklyLearningHours !== null && `about ${background.weeklyLearningHours} hours a week`,
    background.learningStyle && `prefers: ${background.learningStyle}`,
  ].filter(Boolean);
  if (facts.length > 0) lines.push(`Background (self-reported): ${facts.join("; ")}`);
  if (background.previousLearning) lines.push(`Previous learning: ${background.previousLearning}`);
  if (background.existingProjects) lines.push(`Existing projects: ${background.existingProjects}`);

  lines.push("");
  lines.push(`TONE: ${context.tone.preference}. ${TONE_GUIDANCE[context.tone.preference]}`);
  const momentum = MOMENTUM_GUIDANCE[context.tone.momentum];
  if (momentum) lines.push(momentum);
  lines.push("Tone never changes scores or verdicts.");

  lines.push("");
  if (context.currentTheme) {
    const theme = context.currentTheme;
    lines.push(`THIS WEEK'S THEME: ${theme.title} (week ${theme.week} of ${theme.weeks})`);
  }
  if (context.currentProject) {
    const project = context.currentProject;
    const due = project.dueAt ? `, due ${project.dueAt.slice(0, 10)}` : "";
    const stack = project.stack ? ` [${project.stack}]` : "";
    lines.push(
      `CURRENT PROJECT (${project.status.replace("_", " ")}${due}): ${project.title}${stack}. ${project.objective}`,
    );
  } else {
    lines.push("CURRENT PROJECT: none right now.");
  }

  if (context.recentProjects.length > 0) {
    lines.push("");
    lines.push("RECENT PROJECTS");
    for (const project of context.recentProjects.slice(0, LIMITS.projects)) {
      const points = project.points
        ? `, ${project.points.scored}/${project.points.available} (${project.points.criteria
            .map((criterion) => `${criterion.key} ${criterion.score}/${criterion.max}`)
            .join(", ")})`
        : "";
      const ended =
        project.ended === "expired"
          ? "missed, ran out of time before it was handed in"
          : project.ended === "skipped"
            ? "skipped"
            : "not evaluated";
      lines.push(`- ${project.title}: ${project.outcome ?? ended}${points}`);
    }
  }

  if (context.recentConcepts.length > 0) {
    lines.push("");
    lines.push("RECENT CONCEPTS (researched and explained back)");
    for (const concept of context.recentConcepts.slice(0, LIMITS.concepts)) {
      const verdict =
        concept.verdict === "not_yet"
          ? "not yet"
          : concept.verdict === "partly"
            ? "partly there"
            : concept.verdict;
      lines.push(`- ${concept.day} ${concept.title}: ${verdict ?? "not explained"}`);
    }
  }

  if (context.recentMistakes.length > 0) {
    lines.push("");
    lines.push("RECENT MISTAKES (look for patterns)");
    for (const mistake of context.recentMistakes.slice(0, LIMITS.mistakes)) lines.push(`- ${mistake}`);
  }

  return lines.join("\n");
}
