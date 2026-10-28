import "server-only";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { learningPath, learningPathItem, skill, userSkill } from "@/db/schema";
import type { StudyGuide } from "@/db/schema/learning";
import { buildLearnerContext } from "@/server/ai/context";
import { safeUrl } from "@/server/ai/modules/mission-sanitize";
import { PROMPT_VERSION, writeStudyGuide } from "@/server/ai/modules/study-guide-writer";
import { release, take, type Limit } from "@/server/throttle";

/** One write per step at a time: a second request finds the first one's guide instead of paying twice. */
const GUIDE_WRITE: Limit = { max: 1, perSeconds: 120 };

export class StepNotFoundError extends Error {
  constructor() {
    super("Path step not found");
    this.name = "StepNotFoundError";
  }
}

/**
 * The study guide for a step on the learner's active path, written first if it has none (Part D).
 * Returns null while another request is writing it.
 */
export async function ensureStudyGuide(userId: string, pathItemId: string): Promise<StudyGuide | null> {
  const [row] = await db
    .select({
      title: learningPathItem.title,
      reason: learningPathItem.reason,
      guide: learningPathItem.guide,
      skill: { id: skill.id, slug: skill.slug, name: skill.name, description: skill.description },
      estimate: {
        ability: userSkill.ability,
        confidence: userSkill.confidence,
        evidenceCount: userSkill.evidenceCount,
      },
    })
    .from(learningPathItem)
    .innerJoin(
      learningPath,
      and(
        eq(learningPath.id, learningPathItem.pathId),
        eq(learningPath.userId, userId),
        isNull(learningPath.archivedAt),
      ),
    )
    .leftJoin(skill, eq(skill.id, learningPathItem.skillId))
    .leftJoin(userSkill, and(eq(userSkill.skillId, learningPathItem.skillId), eq(userSkill.userId, userId)))
    .where(eq(learningPathItem.id, pathItemId))
    .limit(1);
  if (!row) throw new StepNotFoundError();
  if (row.guide) return row.guide;

  const lock = `guide-write:${pathItemId}`;
  if (!(await take(lock, GUIDE_WRITE))) return null;
  try {
    const context = await buildLearnerContext(userId);
    const { guide, meta } = await writeStudyGuide({
      context,
      step: { title: row.title, reason: row.reason },
      skill: row.skill?.id
        ? {
            slug: row.skill.slug,
            name: row.skill.name,
            description: row.skill.description,
            estimate: row.estimate?.ability != null ? row.estimate : null,
          }
        : null,
    });
    const saved: StudyGuide = {
      summary: guide.summary,
      learn: guide.learn,
      read: guide.read.map(({ url, note, ...resource }) => {
        const safe = safeUrl(url);
        return { ...resource, ...(safe ? { url: safe } : {}), ...(note ? { note } : {}) };
      }),
      practise: guide.practise,
      pitfalls: guide.pitfalls,
      checkpoints: guide.checkpoints,
    };
    await db
      .update(learningPathItem)
      .set({ guide: saved, guideGeneratedBy: `${meta.model}/${PROMPT_VERSION}` })
      .where(and(eq(learningPathItem.id, pathItemId), isNull(learningPathItem.guide)));
    return saved;
  } finally {
    await release(lock).catch(() => undefined);
  }
}
