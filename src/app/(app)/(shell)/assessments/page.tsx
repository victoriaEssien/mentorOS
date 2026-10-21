import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { NAV_FORWARD } from "@/components/shell/page-transition";
import { Screen, ScreenHeader } from "@/components/shell/screen";
import { Badge } from "@/components/ui/badge";
import { ASSESSMENT_KIND_LABEL } from "@/lib/assessment-kinds";
import { getAssessmentHistory } from "@/server/queries/assessments";
import { requireLearner } from "@/server/session";

export const metadata: Metadata = { title: "Assessments" };

export default async function AssessmentsPage() {
  const { user } = await requireLearner();
  const history = await getAssessmentHistory(user.id);

  return (
    <Screen>
      <ScreenHeader
        title="Assessments"
        subtitle="Your diagnostic and every check since, with what each one showed."
        back={{ href: "/profile", label: "You" }}
      />

      {history.length === 0 ? (
        <p className="text-callout text-muted-foreground">
          Nothing yet. Your diagnostic will appear here once it&apos;s written.
        </p>
      ) : (
        <ol className="divide-y divide-rule border-y border-rule">
          {history.map((row) => {
            const done = row.completedAt !== null;
            return (
              <li key={row.id}>
                <Link
                  transitionTypes={NAV_FORWARD}
                  href={done ? `/assessments/${row.id}/results` : `/assessments/${row.id}`}
                  className="flex pressable items-center gap-3 py-3.5 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-footnote text-muted-foreground">
                      {ASSESSMENT_KIND_LABEL[row.kind]},{" "}
                      {(row.completedAt ?? row.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                    <span className="mt-0.5 block truncate text-body font-semibold">{row.title}</span>
                  </span>
                  {done ? (
                    <span className="shrink-0 font-mono text-callout font-semibold tabular-nums">
                      {row.score === null ? "" : `${Math.floor(row.score * 100)}%`}
                    </span>
                  ) : (
                    <Badge variant="signal">Not finished</Badge>
                  )}
                  <ChevronRight className="size-4.5 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </Screen>
  );
}
