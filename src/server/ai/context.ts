import "server-only";

import { NotImplementedError } from "@/lib/errors";

/**
 * Everything an AI module is allowed to know about a learner (PRD §21).
 * Assembled from the database on every call. The model never remembers anything on its own.
 */
export type LearnerContext = {
  userId: string;
  name: string;
  tracks: { slug: string; name: string }[];
  goals: string[];
  background: {
    currentRole?: string;
    yearsExperience?: number;
    technologiesUsed: string[];
    weeklyLearningHours?: number;
    learningStyle?: string;
  };
  skills: {
    skillId: string;
    slug: string;
    name: string;
    ability: number;
    confidence: number;
    evidenceCount: number;
  }[];
  /** Recurring weaknesses observed across evaluations (behaviour 11). */
  weaknessPatterns: string[];
  currentPath: { focusSummary: string; items: { title: string; reason: string; status: string }[] } | null;
  currentMission: { id: string; title: string; type: string; objective: string } | null;
  recentMissions: { title: string; outcome?: string; completedAt?: string }[];
  recentAssessments: { title: string; kind: string; score?: number; completedAt?: string }[];
  recentMistakes: string[];
  recentProjects: string[];
};

export async function buildLearnerContext(userId: string): Promise<LearnerContext> {
  void userId;
  throw new NotImplementedError("buildLearnerContext");
}

/** Compact text rendering of the context for prompts. Keep token use predictable. */
export function renderLearnerContext(context: LearnerContext): string {
  void context;
  throw new NotImplementedError("renderLearnerContext");
}
