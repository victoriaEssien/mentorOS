import "server-only";
import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/db";
import { skill, skillPrerequisite, track, userSkill } from "@/db/schema";
import type { PrerequisiteEdge, SkillState } from "@/server/learning/readiness";

/** Tracks and skills change only when the seed changes; cache them across requests. */
export async function getTaxonomy() {
  "use cache";
  cacheLife("days");
  cacheTag("taxonomy");

  const [tracks, skills] = await Promise.all([
    db.select().from(track).orderBy(track.sortOrder),
    db.select().from(skill).orderBy(skill.sortOrder),
  ]);
  return { tracks, skills };
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
