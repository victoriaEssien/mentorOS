import { Check, Eye, Wrench } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { NAV_FORWARD } from "@/components/shell/page-transition";
import { Screen, ScreenHeader, ScreenSection } from "@/components/shell/screen";
import { CellMeter } from "@/components/system/cell-meter";
import { formatDelta } from "@/components/system/journal";
import { SkillRow } from "@/components/system/skill-row";
import { Button } from "@/components/ui/button";
import { getMissionEvaluation, getMissionsOverview } from "@/server/queries/missions";
import { requireLearner } from "@/server/session";

import { GetMissionPanel } from "../../mission-controls";
import { ClearDraft } from "../submit/hand-in-form";

export const metadata: Metadata = { title: "Evaluation" };

// Getting the next mission from here runs a model call in this route's server action.
export const maxDuration = 120;

const VERDICT = {
  strong: { label: "Strong", line: "Strong evidence. Your path moves on to the next step." },
  pass: { label: "Pass", line: "It holds up. Your path moves on to the next step." },
  partial: { label: "Partial", line: "Close. The next mission keeps this focus, from a different angle." },
  fail: { label: "Didn't pass", line: "Not there yet. The next mission steps back to firmer ground." },
} as const;

export default async function MissionEvaluationPage({
  params,
}: PageProps<"/missions/[missionId]/evaluation">) {
  const { user } = await requireLearner();
  const { missionId } = await params;

  const [view, overview] = await Promise.all([
    getMissionEvaluation(user.id, missionId),
    getMissionsOverview(user.id),
  ]);
  // Not evaluated yet, or not theirs: the mission page knows what to show for either.
  if (!view) redirect(`/missions/${missionId}`);

  const scored = view.criteria.reduce((sum, c) => sum + c.score, 0);
  const available = view.criteria.reduce((sum, c) => sum + c.maxScore, 0);
  const verdict = VERDICT[view.outcome];
  const inPlay = view.mission.cadence === "weekly" ? overview.weekly : overview.daily;
  const unread = view.links.filter((link) => link.note);
  const read = view.links.filter((link) => link.files.length > 0);

  return (
    <Screen>
      <ClearDraft missionId={missionId} />
      <ScreenHeader
        title="Evaluation"
        subtitle={view.mission.title}
        back={{ href: `/missions/${missionId}`, label: "Mission" }}
      />

      <div className="rounded-lg border border-rule bg-window p-5 shadow-window">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-title">{verdict.label}</p>
          <p className="font-mono text-2xl font-semibold tabular-nums">
            {formatPoints(scored)}
            <span className="text-callout text-muted-foreground">/{available}</span>
          </p>
        </div>
        <CellMeter
          value={view.score}
          label={`Overall, ${Math.round(view.score * 100)}%`}
          animate
          className="mt-4 [&>span]:h-4"
        />
        <p className="mt-3 text-callout text-muted-foreground">{verdict.line}</p>
      </div>

      <ScreenSection title="Scores">
        <ul className="divide-y divide-rule border-y border-rule">
          {view.criteria.map((criterion) => (
            <li key={criterion.key} className="py-3.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-body font-semibold">{criterion.label}</span>
                <span className="shrink-0 font-mono text-footnote font-semibold tabular-nums">
                  {formatPoints(criterion.score)}/{criterion.maxScore}
                </span>
              </div>
              <CellMeter
                value={criterion.score / criterion.maxScore}
                label={`${criterion.label}: ${criterion.score} of ${criterion.maxScore}`}
                className="mt-2 [&>span]:h-2"
              />
              <p className="mt-2 text-footnote text-muted-foreground">{criterion.comment}</p>
            </li>
          ))}
        </ul>
      </ScreenSection>

      {view.strengths.length > 0 ? (
        <ScreenSection title="What you did well">
          <Points items={view.strengths} icon={<Check className="size-4 text-pass" aria-hidden />} />
        </ScreenSection>
      ) : null}

      {view.weaknesses.length > 0 ? (
        <ScreenSection title="What needs work">
          <Points
            items={view.weaknesses}
            icon={<Wrench className="size-4 text-muted-foreground" aria-hidden />}
          />
        </ScreenSection>
      ) : null}

      <ScreenSection title="Why">
        <p className="text-callout">{view.why}</p>
      </ScreenSection>

      {unread.length > 0 || view.unseen ? (
        <ScreenSection title="What I couldn't see">
          <div className="flex gap-3 rounded-lg border border-dashed border-rule-strong p-4 text-footnote text-muted-foreground">
            <Eye className="mt-0.5 size-4 shrink-0" aria-hidden />
            <div className="flex flex-col gap-1.5">
              {view.unseen ? <p>{view.unseen}</p> : null}
              {unread.map((link) => (
                <p key={link.url} className="wrap-anywhere">
                  {link.url}: {link.note}
                </p>
              ))}
            </div>
          </div>
        </ScreenSection>
      ) : null}

      {view.changes.length > 0 ? (
        <ScreenSection title="What it changed">
          <ul className="divide-y divide-rule border-y border-rule">
            {view.changes.map((change) => (
              <li key={change.slug}>
                <SkillRow
                  name={change.name}
                  estimate={change.after}
                  href={`/profile/skills/${change.slug}`}
                  caption={`${formatDelta(change.after.ability - change.before.ability)} from this ${view.mission.cadence === "weekly" ? "challenge" : "mission"}`}
                />
              </li>
            ))}
          </ul>
          {read.length > 0 ? (
            <p className="mt-2 text-caption text-muted-foreground">
              Read from your links:{" "}
              {read.map((link) => `${link.files.length} files from ${link.url}`).join("; ")}.
            </p>
          ) : null}
        </ScreenSection>
      ) : null}

      <ScreenSection title="Next">
        <p className="mb-4 text-callout">{view.next}</p>
        {inPlay ? (
          <Button asChild size="lg" className="w-full">
            <Link transitionTypes={NAV_FORWARD} href={`/missions/${inPlay.id}`}>
              Go to your next mission
            </Link>
          </Button>
        ) : (
          <GetMissionPanel
            cadence={view.mission.cadence}
            title={
              view.mission.cadence === "weekly"
                ? "Ready for next week's challenge?"
                : "Ready for the next mission?"
            }
            description="Pitched from how this one went."
            action={view.mission.cadence === "weekly" ? "Get the next challenge" : "Get the next mission"}
          />
        )}
      </ScreenSection>
    </Screen>
  );
}

function Points({ items, icon }: { items: string[]; icon: React.ReactNode }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-callout">
          <span className="mt-1 shrink-0">{icon}</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

/** Half points show as .5; whole points without decimals. */
function formatPoints(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
