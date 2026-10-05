import "server-only";
import { tool } from "ai";
import { z } from "zod";

import type { LearnerContext } from "@/server/ai/context";
import { explainConcept } from "@/server/ai/modules/tutor";
import { getMissionDetail } from "@/server/queries/missions";
import { getLastPlannedAt, getPathOverview } from "@/server/queries/path";
import { getSkillDetail } from "@/server/queries/profile";

import { checkOnSkill } from "./checks";
import { assignMission, NoPathError } from "./missions";
import { planPath } from "./path";

/** Planning is a model call; the mentor can't replan more than once a minute either. */
const REPLAN_COOLDOWN_MS = 60_000;

/**
 * What the mentor can do, bound to one learner. Each tool reads through the queries or acts
 * through the learning layer, so the mentor never writes learner state on its own (AGENTS.md).
 * Failures come back as plain results the mentor can explain, rather than errors.
 */
export function mentorTools(userId: string, context: LearnerContext) {
  return {
    explain_concept: tool({
      description:
        "Explain a concept, or answer a how or why question, at the learner's level. The explanation is shown to them as its own card.",
      inputSchema: z.object({
        question: z.string().describe("What to explain, in the learner's terms"),
        level: z.enum(["beginner", "intermediate", "advanced"]),
      }),
      execute: async ({ question, level }) => ({
        explanation: await explainConcept({ context, question, level }),
      }),
    }),

    show_skill: tool({
      description: "Look up one skill's current estimate and its most recent evidence.",
      inputSchema: z.object({ skill: z.string().describe("Skill slug") }),
      execute: async ({ skill }) => {
        const detail = await getSkillDetail(userId, skill.trim().toLowerCase());
        if (!detail) return { found: false as const };
        return {
          found: true as const,
          slug: detail.skill.slug,
          name: detail.skill.name,
          estimate: detail.estimate,
          recentEvidence: detail.evidence.slice(0, 5).map((entry) => ({
            source: entry.source,
            summary: entry.summary,
            change: entry.delta,
            date: entry.createdAt.toISOString().slice(0, 10),
          })),
        };
      },
    }),

    test_me: tool({
      description: "Write a short check on one skill and give the learner a link to take it.",
      inputSchema: z.object({ skill: z.string().describe("Skill slug") }),
      execute: async ({ skill }) => {
        const slug = skill.trim().toLowerCase();
        const { assessmentId } = await checkOnSkill(userId, slug);
        return { assessmentId, skill: slug };
      },
    }),

    change_path: tool({
      description:
        "Replan the learning path around what the learner asked for. The planner decides what is ready; report what it decided.",
      inputSchema: z.object({ request: z.string().describe("Their request, in their words") }),
      execute: async ({ request }) => {
        const last = await getLastPlannedAt(userId);
        if (last && Date.now() - last.getTime() < REPLAN_COOLDOWN_MS) {
          return { replanned: false as const, reason: "The path was planned less than a minute ago." };
        }
        await planPath(userId, request.slice(0, 500));
        const { active, current, deferred } = await getPathOverview(userId);
        return {
          replanned: true as const,
          focusSummary: active?.focusSummary ?? null,
          currentFocus: current?.title ?? null,
          notYet: deferred.map((item) => ({
            title: item.title,
            reason: item.reason,
            unlockWhen: item.unlockWhen,
          })),
        };
      },
    }),

    next_mission: tool({
      description: "Get the learner's next daily mission, or the one already in play.",
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const { missionId, created } = await assignMission(userId, "daily");
          const detail = await getMissionDetail(userId, missionId);
          return { missionId, created, title: detail?.mission.title ?? null };
        } catch (error) {
          if (error instanceof NoPathError)
            return { missionId: null, reason: "They have no learning path yet." };
          throw error;
        }
      },
    }),
  };
}

export type MentorTools = ReturnType<typeof mentorTools>;
