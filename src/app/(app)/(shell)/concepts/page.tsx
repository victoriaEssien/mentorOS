import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

import { NAV_FORWARD } from "@/components/shell/page-transition";
import { Screen, ScreenHeader, ScreenSection } from "@/components/shell/screen";
import { Badge } from "@/components/ui/badge";
import { knownTimeZone, TIME_ZONE_COOKIE, today } from "@/lib/local-time";
import { VERDICT_BADGE } from "@/lib/verdicts";
import { getConceptHistory } from "@/server/queries/concepts";
import { requireLearner } from "@/server/session";

export const metadata: Metadata = { title: "Concepts" };

/** Every concept explained or due, newest first, with its verdict: the history to scroll back through. */
export default async function ConceptsPage() {
  const { user } = await requireLearner();
  const [history, cookieStore] = await Promise.all([getConceptHistory(user.id), cookies()]);
  const day = today(knownTimeZone(cookieStore.get(TIME_ZONE_COOKIE)?.value));

  return (
    <Screen>
      <ScreenHeader
        title="Concepts"
        subtitle="Everything you've explained, with the verdict and the feedback."
      />

      {history.length === 0 ? (
        <p className="text-callout text-muted-foreground">Your first concept is waiting on Today.</p>
      ) : (
        <ScreenSection>
          <ol className="divide-y divide-rule border-y border-rule">
            {history.map((row) => {
              const badge = row.verdict ? VERDICT_BADGE[row.verdict] : null;
              return (
                <li key={row.id}>
                  <Link
                    transitionTypes={NAV_FORWARD}
                    href={`/concepts/${row.id}`}
                    className="flex pressable items-center justify-between gap-3 py-3.5 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-body font-semibold">{row.title}</span>
                      <span className="block text-footnote text-muted-foreground">
                        {row.kind === "new" ? "New" : "Review"}, {row.theme},{" "}
                        {new Date(`${row.day}T12:00:00Z`).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {badge ? (
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      ) : (
                        <Badge variant={row.day === day ? "signal" : "outline"}>
                          {row.day === day ? "To explain" : "Not explained"}
                        </Badge>
                      )}
                      <ChevronRight aria-hidden className="size-4.5 text-muted-foreground" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </ScreenSection>
      )}
    </Screen>
  );
}
