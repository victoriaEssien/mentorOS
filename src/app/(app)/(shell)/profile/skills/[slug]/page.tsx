import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Screen, ScreenHeader, ScreenSection } from "@/components/shell/screen";
import { CellMeter } from "@/components/system/cell-meter";
import { Journal } from "@/components/system/journal";
import { confidenceCaption } from "@/components/system/skill-row";
import { abilityLabel } from "@/lib/skill-labels";
import { confidenceBand } from "@/server/learning/skill-estimate";
import { getSkillDetail } from "@/server/queries/profile";
import { REASSESS_BELOW_CONFIDENCE } from "@/server/learning/checks";
import { requireLearner } from "@/server/session";

import { TestMe } from "./test-me";

export const metadata: Metadata = { title: "Skill" };

// "Test me" writes a check with the model inside this route's server action.
export const maxDuration = 120;

export default async function SkillPage({ params }: PageProps<"/profile/skills/[slug]">) {
  const { user } = await requireLearner();
  const { slug } = await params;

  const detail = await getSkillDetail(user.id, slug);
  if (!detail) notFound();
  const { skill, where, estimate, evidence } = detail;

  return (
    <Screen>
      <ScreenHeader
        title={skill.name}
        subtitle={where || undefined}
        back={{ href: "/profile", label: "You" }}
      />

      <div className="rounded-lg border border-rule bg-window p-5 shadow-window">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <p className="text-headline">{estimate ? abilityLabel(estimate.ability) : "Not measured yet"}</p>
            <p className="text-footnote text-muted-foreground">
              {estimate
                ? confidenceCaption(estimate, { one: "piece of evidence", many: "pieces of evidence" })
                : "Nothing has tested this skill yet."}
            </p>
          </div>
          {estimate ? (
            <span className="font-mono text-2xl font-semibold tabular-nums">
              {Math.floor(estimate.ability * 100)}%
            </span>
          ) : null}
        </div>
        <CellMeter
          value={estimate?.ability ?? 0}
          confidence={estimate ? confidenceBand(estimate.confidence) : "high"}
          label={`${skill.name} ability`}
          animate={Boolean(estimate)}
          className="mt-4 [&>span]:h-4"
        />
      </div>

      <ScreenSection>
        <TestMe
          slug={skill.slug}
          name={skill.name}
          reassess={estimate !== null && estimate.confidence < REASSESS_BELOW_CONFIDENCE}
        />
      </ScreenSection>

      {skill.description ? (
        <ScreenSection title="What it covers">
          <p className="text-callout text-muted-foreground">{skill.description}</p>
        </ScreenSection>
      ) : null}

      <ScreenSection title="Evidence">
        {evidence.length > 0 ? (
          <Journal
            className="border-y border-rule"
            entries={evidence.map((entry) => ({
              id: entry.id,
              when: entry.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
              label: entry.source,
              text: entry.summary,
              delta: entry.delta,
              href: entry.href,
            }))}
          />
        ) : (
          <p className="text-callout text-muted-foreground">
            No evidence yet. The next knowledge check or mission that uses {skill.name} will start this log.
          </p>
        )}
        <p className="mt-4 text-caption text-muted-foreground">
          Every answer, mission and project adds a line here, and nothing is ever removed. Recent evidence
          counts more, missions and projects count more than single answers, and confidence grows as the
          evidence agrees.
        </p>
      </ScreenSection>
    </Screen>
  );
}
