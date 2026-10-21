import type { LearningPlan } from "../schemas";

/**
 * Holds the Learning Planner's output to what the code knows. The schema guarantees shape; this
 * guarantees meaning, and enforces "not yet" (behaviour 17) instead of trusting the model with it:
 *
 * - items name skills from the learner's tracks, or none (a capstone that ties several together)
 * - a skill whose prerequisites aren't met never becomes an item: it moves to "not yet", with what
 *   it is waiting on
 * - no skill appears twice, at most one capstone, and the path stays short
 */

export const MAX_PATH_ITEMS = 6;

export type PathItemPlan = { skill: string | null; title: string; reason: string };
export type DeferredPlan = PathItemPlan & { unlockWhen: string };

export type SanitizedPlan = {
  focusSummary: string;
  items: PathItemPlan[];
  deferred: DeferredPlan[];
  dropped: number;
};

export function sanitizePlan(
  plan: LearningPlan,
  /** Slug to display name, for every skill the learner may be planned on. */
  skillNames: ReadonlyMap<string, string>,
  /** Blocked skill slug to the slugs of the prerequisites it waits on. */
  blocked: ReadonlyMap<string, readonly string[]>,
): SanitizedPlan {
  const items: PathItemPlan[] = [];
  const deferred: DeferredPlan[] = [];
  const seen = new Set<string>();
  let capstones = 0;
  let dropped = 0;

  const names = (slugs: readonly string[]) => listOf(slugs.map((slug) => skillNames.get(slug) ?? slug));

  for (const item of plan.items) {
    const title = item.title.trim();
    const reason = item.reason.trim();
    const slug = normalise(item.skill);

    if (
      !title ||
      !reason ||
      (slug && !skillNames.has(slug) && !blocked.has(slug)) ||
      (slug && seen.has(slug))
    ) {
      dropped++;
      continue;
    }
    if (slug) seen.add(slug);

    const waitingOn = slug ? blocked.get(slug) : undefined;
    if (waitingOn && waitingOn.length > 0) {
      deferred.push({
        skill: slug,
        title,
        reason: `Not yet: it builds on ${names(waitingOn)}, and I haven't seen enough of that from you.`,
        unlockWhen: `When ${names(waitingOn)} ${waitingOn.length === 1 ? "is" : "are"} at intermediate, with enough evidence to trust it.`,
      });
      continue;
    }

    if (!slug && ++capstones > 1) {
      dropped++;
      continue;
    }
    if (items.length >= MAX_PATH_ITEMS) {
      dropped++;
      continue;
    }
    items.push({ skill: slug, title, reason });
  }

  for (const entry of plan.deferred) {
    const slug = normalise(entry.skill);
    if (slug && deferred.some((d) => d.skill === slug)) continue;
    deferred.push({
      skill: slug && (skillNames.has(slug) || blocked.has(slug)) ? slug : null,
      title: entry.request.trim(),
      reason: entry.reason.trim(),
      unlockWhen: entry.unlockWhen.trim(),
    });
  }

  // A capstone can't be the current focus: it combines what comes before it.
  if (items.length > 1 && items[0].skill === null) items.push(items.shift()!);

  return { focusSummary: plan.focusSummary.trim(), items, deferred, dropped };
}

function normalise(slug: string | null): string | null {
  const value = slug?.trim().toLowerCase();
  return value ? value : null;
}

/** "SQL", "SQL and Indexing", "SQL, Indexing and Transactions". */
function listOf(values: string[]): string {
  if (values.length <= 1) return values[0] ?? "";
  return `${values.slice(0, -1).join(", ")} and ${values.at(-1)}`;
}
