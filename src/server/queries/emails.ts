import "server-only";
import { and, count, desc, eq, gte, isNotNull, max } from "drizzle-orm";

import { db } from "@/db";
import { assessment, assessmentAttempt, evaluation, skill, skillEvidence, userSkill } from "@/db/schema";
import { durationLabel, tallyLabel, timeLeftLabel } from "@/lib/mission-labels";
import { abilityLabel } from "@/lib/skill-labels";
import { nextAction } from "@/lib/today";
import type { DailyDigest, TodayPoint, WeeklyDigest } from "@/server/email/engagement-emails";
import { runnerConfigured } from "@/server/runner/run";

import { getDailySetStatus } from "./assessments";
import { getMissionsOverview, getMissionTally } from "./missions";
import { getPathOverview } from "./path";
import { getWeekPost } from "./posts";
import { getRecentResults, getToday } from "./today";

/** What a learner's last week showed, for the Monday email. */
export async function getWeeklyDigest(userId: string, since: Date): Promise<WeeklyDigest> {
  const [results, skills, path, missions, tally, week] = await Promise.all([
    getRecentResults(userId, 6, since),
    db
      .select({ name: skill.name, ability: userSkill.ability, pieces: count() })
      .from(skillEvidence)
      .innerJoin(skill, eq(skill.id, skillEvidence.skillId))
      .leftJoin(
        userSkill,
        and(eq(userSkill.userId, skillEvidence.userId), eq(userSkill.skillId, skillEvidence.skillId)),
      )
      .where(and(eq(skillEvidence.userId, userId), gte(skillEvidence.createdAt, since)))
      .groupBy(skill.id, skill.name, userSkill.ability)
      .orderBy(desc(count()))
      .limit(4),
    getPathOverview(userId),
    getMissionsOverview(userId),
    getMissionTally(userId, since),
    getWeekPost(userId, since.toISOString().slice(0, 10)),
  ]);

  return {
    results: results.map(({ title, label, outcome }) => ({ title, label, outcome })),
    skills: skills.map((s) => ({
      name: s.name,
      level: s.ability === null ? "Not measured" : abilityLabel(s.ability),
      pieces: Number(s.pieces),
    })),
    missions: tallyLabel(tally),
    focus: path.current?.title ?? null,
    challenge: missions.weekly?.title ?? null,
    post: week.draft ? { linkedin: week.draft.linkedin, x: week.draft.x } : null,
  };
}

/**
 * What the daily email says: what was handed in over the last day, how long since the last
 * hand-in, today's next step and coding set, and the last seven days in a line.
 */
export async function getDailyDigest(userId: string, now: Date): Promise<DailyDigest> {
  const day = now.toISOString().slice(0, 10);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const [point, yesterday, [last], tally, [fives], path] = await Promise.all([
    getTodayPoint(userId),
    getRecentResults(userId, 6, new Date(now.getTime() - 24 * 60 * 60 * 1000)),
    db
      .select({ at: max(evaluation.createdAt) })
      .from(evaluation)
      .where(eq(evaluation.userId, userId)),
    getMissionTally(userId, weekAgo),
    db
      .select({ done: count() })
      .from(assessmentAttempt)
      .innerJoin(assessment, eq(assessment.id, assessmentAttempt.assessmentId))
      .where(
        and(
          eq(assessmentAttempt.userId, userId),
          eq(assessment.kind, "daily"),
          isNotNull(assessmentAttempt.completedAt),
          gte(assessmentAttempt.completedAt, weekAgo),
        ),
      ),
    getPathOverview(userId),
  ]);

  // The coding set is offered once there's a path and code can run.
  const set = runnerConfigured() && path.active ? await getDailySetStatus(userId, day) : undefined;
  return {
    point,
    yesterday: yesterday.map(({ title, label, outcome }) => ({ title, label, outcome })),
    daysSinceHandIn: last?.at
      ? Math.floor((now.getTime() - last.at.getTime()) / (24 * 60 * 60 * 1000))
      : null,
    dailyFive:
      set === undefined
        ? null
        : set === null
          ? { state: "not-started" }
          : set.completed
            ? { state: "done" }
            : { state: "in-progress", answered: set.answered, total: set.total },
    week: { fivesDone: Number(fives?.done ?? 0), missions: tallyLabel(tally) },
  };
}

/**
 * What the daily email points at: the same thing Today would put first. A surprise check stays a
 * surprise, so then the email only says something is waiting.
 */
export async function getTodayPoint(userId: string): Promise<TodayPoint> {
  const today = await getToday(userId);
  const next = nextAction({
    openDiagnostic: today.openDiagnostic,
    hasDiagnostic: today.hasDiagnostic,
    hasPath: Boolean(today.path.active),
    pathOnItsWay: today.path.firstPathOnItsWay,
    openSurprise: today.openSurprise,
    daily: today.daily,
    dailyOver: today.dailyOver,
    openChecks: today.openChecks,
  });

  switch (next.kind) {
    case "mission": {
      const duration = durationLabel(next.mission.estimatedMinutes);
      const left = timeLeftLabel(next.mission.dueAt);
      return {
        headline: "Your mission is still waiting",
        detail: `${next.mission.title}${duration ? `, ${duration.toLowerCase()}` : ""}. It's where you left it${left ? `, with ${left}` : ""}.`,
        action: "Pick it up",
        path: `/missions/${next.mission.id}`,
      };
    }
    case "mission-over":
      return {
        headline: "Your last mission ran out of time",
        detail: `${next.mission.title} is recorded as missed. A new one is ready when you are.`,
        action: "Get a new mission",
        path: "/today",
      };
    case "check":
      return {
        headline: "Your check is still waiting",
        detail: `${next.assessment.title}. Your answers so far are saved.`,
        action: "Finish the check",
        path: `/assessments/${next.assessment.id}`,
      };
    case "diagnostic":
      return {
        headline: "Your diagnostic is still waiting",
        detail: "Your path, your missions and every estimate start from it. Your answers so far are saved.",
        action: "Continue the diagnostic",
        path: `/assessments/${next.assessment.id}`,
      };
    case "write-diagnostic":
      return {
        headline: "Your diagnostic is ready to write",
        detail: null,
        action: "Open mentorOS",
        path: "/today",
      };
    case "plan-path":
    case "path-on-its-way":
      return {
        headline: "Your path is ready to plan",
        detail: "It decides what your missions work on, and takes about half a minute.",
        action: "Plan my path",
        path: "/path",
      };
    case "surprise":
      return {
        headline: "Something's waiting for you on Today",
        detail: null,
        action: "Open mentorOS",
        path: "/today",
      };
    case "get-mission":
      return {
        headline: "Your next mission is ready when you are",
        detail: today.path.current ? `Your current focus: ${today.path.current.title}.` : null,
        action: "Get today's mission",
        path: "/today",
      };
  }
}
