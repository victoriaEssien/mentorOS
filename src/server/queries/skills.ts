import "server-only";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/db";
import { skill, skillPlacement, skillPrerequisite, track, userSkill } from "@/db/schema";
import type { PrerequisiteEdge, SkillState } from "@/server/learning/readiness";

/** Tracks, skills and where each skill sits in each track. Changes only when the seed changes. */
export async function getTaxonomy() {
  "use cache";
  cacheLife("days");
  cacheTag("taxonomy");

  const [tracks, skills, placements] = await Promise.all([
    db.select().from(track).orderBy(track.sortOrder),
    db.select().from(skill).orderBy(skill.sortOrder),
    db.select().from(skillPlacement).orderBy(skillPlacement.sortOrder),
  ]);
  return { tracks, skills, placements };
}

export type Taxonomy = Awaited<ReturnType<typeof getTaxonomy>>;

/** Assessable (leaf) skills placed in any of the given tracks, in tree order, without repeats. */
export async function getTrackSkills(trackIds: readonly string[]) {
  "use cache";
  cacheLife("days");
  cacheTag("taxonomy");

  if (trackIds.length === 0) return [];
  const rows = await db
    .select({
      id: skill.id,
      slug: skill.slug,
      name: skill.name,
      description: skill.description,
      trackId: skillPlacement.trackId,
    })
    .from(skillPlacement)
    .innerJoin(skill, eq(skillPlacement.skillId, skill.id))
    .where(and(inArray(skillPlacement.trackId, [...trackIds]), isNotNull(skillPlacement.parentId)))
    .orderBy(skillPlacement.sortOrder);

  const seen = new Set<string>();
  return rows.filter((row) => (seen.has(row.id) ? false : (seen.add(row.id), true)));
}

export async function getPrerequisiteEdges(): Promise<PrerequisiteEdge[]> {
  "use cache";
  cacheLife("days");
  cacheTag("taxonomy");

  const required = alias(skill, "required");
  return db
    .select({ skillSlug: skill.slug, requiresSlug: required.slug })
    .from(skillPrerequisite)
    .innerJoin(skill, eq(skillPrerequisite.skillId, skill.id))
    .innerJoin(required, eq(skillPrerequisite.requiresSkillId, required.id));
}

/** The learner's current estimates keyed by skill slug. */
export async function getSkillStates(userId: string): Promise<Map<string, SkillState>> {
  const rows = await db
    .select({ slug: skill.slug, ability: userSkill.ability, confidence: userSkill.confidence })
    .from(userSkill)
    .innerJoin(skill, eq(userSkill.skillId, skill.id))
    .where(eq(userSkill.userId, userId));
  return new Map(rows.map((row) => [row.slug, { ability: row.ability, confidence: row.confidence }]));
}
