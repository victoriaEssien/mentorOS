import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import { db } from "@/db";
import { skillEvidence, userSkill } from "@/db/schema";
import type { NewEvidenceRow } from "@/server/ai/modules/skill-profile-updater";

import { planSkillChanges, type SkillChange } from "./evidence";
import { estimateSkill, type EvidenceObservation } from "./skill-estimate";

/**
 * The only path by which evidence enters the system. Appends the rows (skill_evidence is
 * append-only) and refreshes the derived user_skill snapshot in one transaction, so the two can
 * never disagree after a write.
 */
export async function recordEvidence(
  userId: string,
  rows: readonly NewEvidenceRow[],
  now: Date = new Date(),
): Promise<SkillChange[]> {
  const { changes, statements } = await prepareEvidence(userId, rows, now);
  if (statements.length > 0) await db.batch(statements as [BatchItem<"pg">, ...BatchItem<"pg">[]]);
  return changes;
}

/**
 * recordEvidence's writes, unsent, for a caller that commits them with its own writes in one
 * transaction (grading writes the evaluation and the evidence together). Reads the existing
 * evidence now, so send the statements straight away.
 */
export async function prepareEvidence(
  userId: string,
  rows: readonly NewEvidenceRow[],
  now: Date = new Date(),
): Promise<{ changes: SkillChange[]; statements: BatchItem<"pg">[] }> {
  if (rows.length === 0) return { changes: [], statements: [] };

  const skillIds = [...new Set(rows.map((row) => row.skillId))];
  const changes = planSkillChanges(await loadObservations(userId, skillIds), rows, now);

  return {
    changes,
    statements: [
      db.insert(skillEvidence).values(rows.map((row) => ({ ...row, createdAt: now }))),
      upsertSnapshot(
        userId,
        changes.map((change) => ({ skillId: change.skillId, estimate: change.after, lastEvidenceAt: now })),
        now,
      ),
    ],
  };
}

/**
 * Rebuilds the snapshot from evidence alone. Use after changing the estimate formula, or to
 * refresh confidence that has decayed since the last write.
 */
export async function recomputeUserSkills(
  userId: string,
  skillIds?: readonly string[],
  now: Date = new Date(),
) {
  const observations = await loadObservations(userId, skillIds);
  if (observations.size === 0) return;

  await upsertSnapshot(
    userId,
    [...observations].map(([skillId, list]) => ({
      skillId,
      estimate: estimateSkill([...list], now),
      lastEvidenceAt: new Date(Math.max(...list.map((observation) => observation.createdAt.getTime()))),
    })),
    now,
  );
}

async function loadObservations(userId: string, skillIds?: readonly string[]) {
  const rows = await db
    .select({
      skillId: skillEvidence.skillId,
      score: skillEvidence.score,
      confidence: skillEvidence.confidence,
      sourceType: skillEvidence.sourceType,
      createdAt: skillEvidence.createdAt,
    })
    .from(skillEvidence)
    .where(
      skillIds
        ? and(eq(skillEvidence.userId, userId), inArray(skillEvidence.skillId, [...skillIds]))
        : eq(skillEvidence.userId, userId),
    );

  const bySkill = new Map<string, EvidenceObservation[]>();
  for (const { skillId, ...observation } of rows) {
    const list = bySkill.get(skillId) ?? [];
    list.push(observation);
    bySkill.set(skillId, list);
  }
  return bySkill;
}

function upsertSnapshot(
  userId: string,
  estimates: { skillId: string; estimate: SkillChange["after"]; lastEvidenceAt: Date }[],
  now: Date,
) {
  return db
    .insert(userSkill)
    .values(
      estimates.map(({ skillId, estimate, lastEvidenceAt }) => ({
        userId,
        skillId,
        ability: estimate.ability,
        confidence: estimate.confidence,
        evidenceCount: estimate.evidenceCount,
        lastEvidenceAt,
      })),
    )
    .onConflictDoUpdate({
      target: [userSkill.userId, userSkill.skillId],
      set: {
        ability: sql`excluded.ability`,
        confidence: sql`excluded.confidence`,
        evidenceCount: sql`excluded.evidence_count`,
        lastEvidenceAt: sql`greatest(${userSkill.lastEvidenceAt}, excluded.last_evidence_at)`,
        updatedAt: now,
      },
    });
}
