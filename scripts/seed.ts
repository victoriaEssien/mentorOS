/**
 * Seeds tracks, skills and prerequisites. Safe to re-run: existing slugs are left alone.
 *   pnpm db:seed
 */
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "../src/db/schema";
import { prerequisites, skills, tracks } from "../src/db/seed/taxonomy";

config({ path: ".env.local" });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local first.");

  const db = drizzle({ client: neon(url), schema, casing: "snake_case" });

  await db
    .insert(schema.track)
    .values(tracks.map((t, i) => ({ ...t, sortOrder: i })))
    .onConflictDoNothing({ target: schema.track.slug });

  const trackRows = await db.select().from(schema.track);
  const trackId = new Map(trackRows.map((t) => [t.slug, t.id]));

  // Parents first so children can reference them.
  for (const pass of [skills.filter((s) => !s.parent), skills.filter((s) => s.parent)]) {
    const existing = new Map((await db.select().from(schema.skill)).map((s) => [s.slug, s.id]));
    await db
      .insert(schema.skill)
      .values(
        pass.map((s, i) => ({
          slug: s.slug,
          name: s.name,
          trackId: trackId.get(s.track) ?? null,
          parentId: s.parent ? (existing.get(s.parent) ?? null) : null,
          sortOrder: i,
        })),
      )
      .onConflictDoNothing({ target: schema.skill.slug });
  }

  const skillId = new Map((await db.select().from(schema.skill)).map((s) => [s.slug, s.id]));
  const prereqRows = prerequisites.flatMap(([skill, requires]) => {
    const a = skillId.get(skill);
    const b = skillId.get(requires);
    return a && b ? [{ skillId: a, requiresSkillId: b }] : [];
  });
  if (prereqRows.length) await db.insert(schema.skillPrerequisite).values(prereqRows).onConflictDoNothing();

  console.log(`Seeded ${tracks.length} tracks, ${skills.length} skills, ${prereqRows.length} prerequisites.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
