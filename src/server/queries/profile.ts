import "server-only";
import { and, asc, eq } from "drizzle-orm";
import type { Route } from "next";

import { db } from "@/db";
import { assessment, assessmentAttempt, skillEvidence, userSkill, userTrack } from "@/db/schema";
import { ASSESSMENT_KIND_LABEL } from "@/lib/assessment-kinds";
import { replayEvidence } from "@/server/learning/evidence";

import { getTaxonomy } from "./skills";

export type SkillEstimateView = {
  ability: number;
  confidence: number;
  evidenceCount: number;
};

/**
 * The learner's skill profile: each of their tracks as groups of skills, in tree order, with the
 * current estimate or null when nothing has measured the skill yet (PRD §10, §11, §28).
 */
export async function getSkillProfile(userId: string) {
  const [{ tracks, skills, placements }, mine, estimates] = await Promise.all([
    getTaxonomy(),
    db.select({ trackId: userTrack.trackId }).from(userTrack).where(eq(userTrack.userId, userId)),
    db
      .select({
        skillId: userSkill.skillId,
        ability: userSkill.ability,
        confidence: userSkill.confidence,
        evidenceCount: userSkill.evidenceCount,
      })
      .from(userSkill)
      .where(eq(userSkill.userId, userId)),
  ]);

  const skillById = new Map(skills.map((s) => [s.id, s]));
  const estimateBySkill = new Map(estimates.map(({ skillId, ...estimate }) => [skillId, estimate]));
  const myTracks = new Set(mine.map((row) => row.trackId));

  return tracks
    .filter((track) => myTracks.has(track.id))
    .map((track) => {
      const inTrack = placements.filter((placement) => placement.trackId === track.id);
      const groups = inTrack
        .filter((placement) => placement.parentId === null)
        .flatMap((placement) => {
          const group = skillById.get(placement.skillId);
          if (!group) return [];
          const children = inTrack
            .filter((child) => child.parentId === group.id)
            .flatMap((child) => {
              const leaf = skillById.get(child.skillId);
              return leaf
                ? [
                    {
                      id: leaf.id,
                      slug: leaf.slug,
                      name: leaf.name,
                      estimate: estimateBySkill.get(leaf.id) ?? null,
                    },
                  ]
                : [];
            });
          return children.length > 0 ? [{ id: group.id, name: group.name, skills: children }] : [];
        });
      return { id: track.id, slug: track.slug, name: track.name, groups };
    });
}

export type SkillProfile = Awaited<ReturnType<typeof getSkillProfile>>;

const SOURCE_LABEL = {
  assessment: "Assessment",
  quiz: "Quiz",
  mission: "Mission",
  project: "Project",
  manual: "Self-report",
  reflection: "Reflection",
} as const;

/**
 * One skill in full: where it sits, the current estimate, and every piece of evidence behind it
 * with how far each moved the estimate. Null for a slug that isn't a skill.
 */
export async function getSkillDetail(userId: string, slug: string) {
  const { tracks, skills, placements } = await getTaxonomy();
  const skill = skills.find((s) => s.slug === slug);
  if (!skill) return null;

  const [[estimate], rows] = await Promise.all([
    db
      .select({
        ability: userSkill.ability,
        confidence: userSkill.confidence,
        evidenceCount: userSkill.evidenceCount,
      })
      .from(userSkill)
      .where(and(eq(userSkill.userId, userId), eq(userSkill.skillId, skill.id)))
      .limit(1),
    db
      .select({
        id: skillEvidence.id,
        score: skillEvidence.score,
        confidence: skillEvidence.confidence,
        sourceType: skillEvidence.sourceType,
        summary: skillEvidence.evidenceSummary,
        createdAt: skillEvidence.createdAt,
        assessmentId: assessment.id,
        assessmentKind: assessment.kind,
      })
      .from(skillEvidence)
      .leftJoin(
        assessmentAttempt,
        and(eq(skillEvidence.sourceType, "assessment"), eq(assessmentAttempt.id, skillEvidence.sourceId)),
      )
      .leftJoin(assessment, eq(assessment.id, assessmentAttempt.assessmentId))
      .where(and(eq(skillEvidence.userId, userId), eq(skillEvidence.skillId, skill.id)))
      .orderBy(asc(skillEvidence.createdAt), asc(skillEvidence.id)),
  ]);

  // Where it sits: its home placement first ("Databases, Software Engineering").
  const home = placements.find((p) => p.skillId === skill.id && p.trackId === skill.trackId) ?? null;
  const parent = home?.parentId ? skills.find((s) => s.id === home.parentId) : undefined;
  const homeTrack = tracks.find((t) => t.id === skill.trackId);

  const evidence = replayEvidence(rows)
    .map((row) => ({
      id: row.id,
      createdAt: row.createdAt,
      source: row.assessmentKind ? ASSESSMENT_KIND_LABEL[row.assessmentKind] : SOURCE_LABEL[row.sourceType],
      href: row.assessmentId ? (`/assessments/${row.assessmentId}/results` as Route) : null,
      summary: row.summary,
      delta: row.delta,
    }))
    .reverse();

  return {
    skill: { id: skill.id, slug: skill.slug, name: skill.name, description: skill.description },
    where: [parent?.name, homeTrack?.name].filter(Boolean).join(", "),
    estimate: (estimate ?? null) satisfies SkillEstimateView | null,
    evidence,
  };
}

export type SkillDetail = NonNullable<Awaited<ReturnType<typeof getSkillDetail>>>;
