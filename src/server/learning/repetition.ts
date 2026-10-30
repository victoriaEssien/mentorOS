/**
 * Spaced repetition for concepts, in plain code: the verdict on an explanation, when the concept
 * comes back, and which due concepts make today's session. Pure, so it's tested and never left to
 * the model.
 */

export type ConceptVerdict = "solid" | "partly" | "not_yet";
export type PointStatus = "hit" | "missed" | "wrong";

/** Days until the next review after each solid verdict in a row: 3, then 7, 14, and 30 from then on. */
export const SOLID_LADDER = [3, 7, 14, 30] as const;

/** Reviews in a day's session, on top of the one new concept. */
export const REVIEWS_PER_DAY = 3;

/**
 * The verdict from the checklist, strictly: solid means every point hit and nothing wrong. Anything
 * wrong caps it at partly there (and needs three quarters hit for that); otherwise half hit is
 * partly there. Below that it's not yet.
 */
export function verdictFor(statuses: readonly PointStatus[]): ConceptVerdict {
  if (statuses.length === 0) return "not_yet";
  const hit = statuses.filter((status) => status === "hit").length / statuses.length;
  const wrong = statuses.some((status) => status === "wrong");
  if (!wrong && hit === 1) return "solid";
  if (wrong) return hit >= 0.75 ? "partly" : "not_yet";
  return hit >= 0.5 ? "partly" : "not_yet";
}

/**
 * When a concept comes back after a verdict. Solid climbs the ladder; partly there comes back in two
 * days (one if it was not yet last time); not yet comes back tomorrow. Anything short of solid
 * starts the ladder again.
 */
export function nextSchedule(
  previous: { step: number; lastVerdict: ConceptVerdict | null },
  verdict: ConceptVerdict,
  today: string,
): { step: number; intervalDays: number; nextReviewOn: string } {
  if (verdict === "solid") {
    const step = Math.min(previous.step + 1, SOLID_LADDER.length);
    const intervalDays = SOLID_LADDER[step - 1]!;
    return { step, intervalDays, nextReviewOn: addDays(today, intervalDays) };
  }
  const intervalDays = verdict === "partly" && previous.lastVerdict !== "not_yet" ? 2 : 1;
  return { step: 0, intervalDays, nextReviewOn: addDays(today, intervalDays) };
}

export type ScheduledConcept = {
  conceptSlug: string;
  nextReviewOn: string;
  lastVerdict: ConceptVerdict | null;
};

/** How shaky a concept is: never explained is the shakiest, then not yet, partly there, solid. */
const SHAKINESS: Record<ConceptVerdict | "never", number> = { never: 3, not_yet: 2, partly: 1, solid: 0 };

/**
 * Today's reviews: concepts due today or earlier, most overdue and shakiest first, from any week,
 * capped. The rest stay due and roll over to tomorrow.
 */
export function pickReviews(
  scheduled: readonly ScheduledConcept[],
  today: string,
  {
    exclude = new Set<string>(),
    cap = REVIEWS_PER_DAY,
  }: { exclude?: ReadonlySet<string>; cap?: number } = {},
): { picked: string[]; rolledOver: number } {
  const due = scheduled
    .filter((entry) => entry.nextReviewOn <= today && !exclude.has(entry.conceptSlug))
    .map((entry) => {
      const overdue = daysBetween(entry.nextReviewOn, today);
      return {
        slug: entry.conceptSlug,
        overdue,
        priority: overdue + SHAKINESS[entry.lastVerdict ?? "never"],
      };
    })
    .sort((a, b) => b.priority - a.priority || b.overdue - a.overdue || a.slug.localeCompare(b.slug));
  return { picked: due.slice(0, cap).map((entry) => entry.slug), rolledOver: Math.max(0, due.length - cap) };
}

/** "YYYY-MM-DD" plus a number of days. */
export function addDays(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}
