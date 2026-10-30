import { ChevronRight, Settings } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

import { NAV_FORWARD } from "@/components/shell/page-transition";
import { Screen, ScreenHeader, ScreenSection } from "@/components/shell/screen";
import { Button } from "@/components/ui/button";
import { knownTimeZone, TIME_ZONE_COOKIE, today } from "@/lib/local-time";
import { THEMES } from "@/lib/themes";
import { currentTheme } from "@/server/learning/loop";
import { getLearnerSummary } from "@/server/queries/learner";
import { requireLearner } from "@/server/session";

export const metadata: Metadata = { title: "You" };

const ROW =
  "flex pressable items-center justify-between gap-3 py-3.5 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** Where they are in the curriculum, what they've done so far, and the way to everything else. */
export default async function YouPage() {
  const { user } = await requireLearner();
  const day = today(knownTimeZone((await cookies()).get(TIME_ZONE_COOKIE)?.value));
  const [{ theme }, summary] = await Promise.all([currentTheme(user.id, day), getLearnerSummary(user.id)]);
  const position = THEMES.findIndex((entry) => entry.slug === theme.slug) + 1;

  return (
    <Screen>
      <ScreenHeader
        title="You"
        subtitle={user.name}
        actions={
          <Button asChild variant="ghost" size="icon">
            <Link transitionTypes={NAV_FORWARD} href="/settings" aria-label="Settings">
              <Settings className="size-5.5" />
            </Link>
          </Button>
        }
      />

      <p className="text-body">
        Theme {position} of {THEMES.length}: {theme.title}.
      </p>

      <ScreenSection title="So far">
        <dl className="grid grid-cols-2 gap-3">
          {[
            { label: "Concepts explained", value: summary.conceptsExplained },
            { label: "Explanations written", value: summary.explanations },
            { label: "Projects handed in", value: summary.projectsReviewed },
            { label: "Themes started", value: summary.themesStarted },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-rule bg-window p-4">
              <dt className="text-footnote text-muted-foreground">{item.label}</dt>
              <dd className="mt-1 font-mono text-2xl font-semibold tabular-nums">{item.value}</dd>
            </div>
          ))}
        </dl>
      </ScreenSection>

      <ScreenSection>
        <ul className="divide-y divide-rule border-y border-rule">
          {[
            { href: "/concepts", label: "Every concept you've explained" },
            { href: "/projects", label: "Your projects" },
            { href: "/settings", label: "Settings" },
          ].map((link) => (
            <li key={link.href}>
              <Link transitionTypes={NAV_FORWARD} href={link.href as "/concepts"} className={ROW}>
                <span className="text-body font-semibold">{link.label}</span>
                <ChevronRight aria-hidden className="size-4.5 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </ScreenSection>
    </Screen>
  );
}
