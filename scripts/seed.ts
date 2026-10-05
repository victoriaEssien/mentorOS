/**
 * Seeds tracks, skills, placements and prerequisites from src/db/seed/taxonomy.ts.
 * Safe to re-run: rows are upserted by slug, so the taxonomy file stays the source of truth.
 * Skills removed from the file are left in place (evidence may point at them); placements and
 * prerequisites are synced exactly.
 *   pnpm db:seed
 */
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { notInArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "../src/db/schema";
import { prerequisites, skills, tracks } from "../src/db/seed/taxonomy";

config({ path: ".env.local", quiet: true });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local first.");

  const db = drizzle({ client: neon(url), schema, casing: "snake_case" });

  await db
    .insert(schema.track)
    .values(tracks.map((track, index) => ({ ...track, sortOrder: index })))
    .onConflictDoUpdate({
      target: schema.track.slug,
      set: {
        name: sql`excluded.name`,
        description: sql`excluded.description`,
        sortOrder: sql`excluded.sort_order`,
      },
    });

  const trackId = new Map((await db.select().from(schema.track)).map((t) => [t.slug, t.id]));

  // Groups first so leaf skills can point at them.
  const groups = skills.filter((s) => !s.parent);
  const leaves = skills.filter((s) => s.parent);
  for (const pass of [groups, leaves]) {
    const skillId = new Map((await db.select().from(schema.skill)).map((s) => [s.slug, s.id]));
    await db
      .insert(schema.skill)
      .values(
        pass.map((s) => ({
          slug: s.slug,
          name: s.name,
          description: s.description ?? null,
          trackId: trackId.get(s.track) ?? null,
          parentId: s.parent ? (skillId.get(s.parent) ?? null) : null,
          sortOrder: skills.indexOf(s),
        })),
      )
      .onConflictDoUpdate({
        target: schema.skill.slug,
        set: {
          name: sql`excluded.name`,
          description: sql`excluded.description`,
          trackId: sql`excluded.track_id`,
          parentId: sql`excluded.parent_id`,
          sortOrder: sql`excluded.sort_order`,
        },
      });
  }

  const skillId = new Map((await db.select().from(schema.skill)).map((s) => [s.slug, s.id]));
  const id = (slug: string) => {
    const value = skillId.get(slug);
    if (!value) throw new Error(`Unknown skill slug: ${slug}`);
    return value;
  };

  const placements = skills.flatMap((s, index) => [
    {
      trackId: trackId.get(s.track)!,
      skillId: id(s.slug),
      parentId: s.parent ? id(s.parent) : null,
      sortOrder: index,
    },
    ...(s.alsoIn ?? []).map((placement) => ({
      trackId: trackId.get(placement.track)!,
      skillId: id(s.slug),
      parentId: id(placement.parent),
      sortOrder: index,
    })),
  ]);

  // Replace in one transaction so a failed insert never leaves the trees empty.
  await db.batch([db.delete(schema.skillPlacement), db.insert(schema.skillPlacement).values(placements)]);

  const prereqRows = prerequisites.map(([skill, requires]) => ({
    skillId: id(skill),
    requiresSkillId: id(requires),
  }));
  await db.batch([
    db.delete(schema.skillPrerequisite),
    db.insert(schema.skillPrerequisite).values(prereqRows),
  ]);

  const orphans = await db
    .select({ slug: schema.skill.slug })
    .from(schema.skill)
    .where(
      notInArray(
        schema.skill.slug,
        skills.map((s) => s.slug),
      ),
    );

  console.log(
    `Seeded ${tracks.length} tracks, ${groups.length} groups, ${leaves.length} skills, ` +
      `${placements.length} placements, ${prereqRows.length} prerequisites.`,
  );
  if (orphans.length > 0) {
    console.log(`Left in place (no longer in the taxonomy): ${orphans.map((o) => o.slug).join(", ")}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
