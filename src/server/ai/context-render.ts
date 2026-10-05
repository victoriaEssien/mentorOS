import type { Outcome } from "@/server/learning/difficulty";
import { abilityBand, confidenceBand } from "@/server/learning/skill-estimate";

/**
 * Everything an AI module is allowed to know about a learner (PRD §21), and how it is written into
 * a prompt. Assembled from the database on every call (context.ts); the model never remembers
 * anything on its own. Pure, so prompts are reproducible and testable.
 */

export type MentorTone = "direct" | "balanced" | "supportive";
export type Momentum = "struggling" | "steady" | "cruising";

export type LearnerContext = {
  userId: string;
  name: string;
  tracks: { slug: string; name: string }[];
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
  skills: {
    skillId: string;
    slug: string;
    name: string;
    ability: number;
    confidence: number;
    evidenceCount: number;
  }[];
  /** Skills with enough evidence to call them weak (behaviour 11 looks for patterns here). */
  weakSkills: string[];
  currentPath: {
    focusSummary: string;
    items: { title: string; reason: string; status: string; skill: string | null }[];
  } | null;
  currentMission: { id: string; title: string; type: string; objective: string; status: string } | null;
  recentMissions: { title: string; outcome: Outcome | null; completedAt: string | null }[];
  recentAssessments: { title: string; kind: string; score: number | null; completedAt: string | null }[];
  /** Weaknesses and misconceptions from recent evaluations, newest first. */
  recentMistakes: string[];
};

/** A skill is called weak once there is enough evidence to stand behind a low estimate. */
export const WEAK_ABILITY = 0.45;
export const WEAK_MIN_CONFIDENCE = 0.4;

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

const LIMITS = { skills: 30, missions: 5, assessments: 5, mistakes: 8 };

// Floored, so a percentage never reads as a higher band than the estimate is in (54.9% is "developing").
const percent = (value: number) => `${Math.floor(value * 100)}%`;

/** Compact text rendering of the context for prompts. Bounded lists keep token use predictable. */
export function renderLearnerContext(context: LearnerContext): string {
  const lines: string[] = [];
  const background = context.background;

  lines.push("LEARNER");
  lines.push(`Name: ${context.name}`);
  lines.push(`Tracks: ${context.tracks.map((track) => track.name).join(", ") || "none chosen"}`);
  if (context.goals.length > 0) lines.push(`Goals: ${context.goals.join("; ")}`);

  const facts = [
    background.currentRole && `role: ${background.currentRole}`,
    background.yearsExperience !== null && `${background.yearsExperience} years of experience`,
    background.technologiesUsed.length > 0 && `has used: ${background.technologiesUsed.join(", ")}`,
    background.weeklyLearningHours !== null && `about ${background.weeklyLearningHours} hours a week`,
    background.learningStyle && `prefers: ${background.learningStyle}`,
  ].filter(Boolean);
  if (facts.length > 0) lines.push(`Background (self-reported, not evidence): ${facts.join("; ")}`);
  if (background.previousLearning) lines.push(`Previous learning: ${background.previousLearning}`);
  if (background.existingProjects) lines.push(`Existing projects: ${background.existingProjects}`);

  lines.push("");
  lines.push(`TONE: ${context.tone.preference}. ${TONE_GUIDANCE[context.tone.preference]}`);
  const momentum = MOMENTUM_GUIDANCE[context.tone.momentum];
  if (momentum) lines.push(momentum);
  lines.push("Tone never changes scores, verdicts or whether they are ready for something.");

  lines.push("");
  if (context.skills.length === 0) {
    lines.push("SKILLS: no evidence yet.");
  } else {
    lines.push("SKILLS (slug: ability, confidence, pieces of evidence)");
    for (const skill of context.skills.slice(0, LIMITS.skills)) {
      lines.push(
        `- ${skill.slug} (${skill.name}): ${percent(skill.ability)} ${abilityBand(skill.ability)}, ` +
          `${confidenceBand(skill.confidence)} confidence, ${skill.evidenceCount}`,
      );
    }
    if (context.skills.length > LIMITS.skills) {
      lines.push(`- and ${context.skills.length - LIMITS.skills} more`);
    }
  }
  if (context.weakSkills.length > 0) lines.push(`Demonstrated weak spots: ${context.weakSkills.join(", ")}`);

  lines.push("");
  if (context.currentPath) {
    lines.push(`CURRENT PATH: ${context.currentPath.focusSummary}`);
    context.currentPath.items.forEach((item, index) => {
      lines.push(
        `${index + 1}. [${item.status}] ${item.title}${item.skill ? ` (${item.skill})` : ""}: ${item.reason}`,
      );
    });
  } else {
    lines.push("CURRENT PATH: none yet.");
  }

  if (context.currentMission) {
    const mission = context.currentMission;
    lines.push("");
    lines.push(
      `CURRENT MISSION (${mission.status}): ${mission.title} [${mission.type}]. ${mission.objective}`,
    );
  }

  if (context.recentMissions.length > 0) {
    lines.push("");
    lines.push("RECENT MISSIONS");
    for (const mission of context.recentMissions.slice(0, LIMITS.missions)) {
      lines.push(`- ${mission.title}: ${mission.outcome ?? "not evaluated"}`);
    }
  }

  if (context.recentAssessments.length > 0) {
    lines.push("");
    lines.push("RECENT ASSESSMENTS");
    for (const assessment of context.recentAssessments.slice(0, LIMITS.assessments)) {
      const score = assessment.score === null ? "not graded" : percent(assessment.score);
      lines.push(`- ${assessment.title} (${assessment.kind}): ${score}`);
    }
  }

  if (context.recentMistakes.length > 0) {
    lines.push("");
    lines.push("RECENT MISTAKES (look for patterns)");
    for (const mistake of context.recentMistakes.slice(0, LIMITS.mistakes)) lines.push(`- ${mistake}`);
  }

  return lines.join("\n");
}
