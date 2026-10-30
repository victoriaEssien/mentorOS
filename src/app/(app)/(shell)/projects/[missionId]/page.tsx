import { ArrowUpRight, LoaderCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PipSays } from "@/components/brand/pip";
import { NAV_FORWARD } from "@/components/shell/page-transition";
import { Screen, ScreenHeader, ScreenSection } from "@/components/shell/screen";
import { DifficultyCells } from "@/components/system/difficulty-cells";
import { RichText } from "@/components/system/rich-text";
import { Button } from "@/components/ui/button";
import {
  durationLabel,
  instructionSteps,
  MISSION_STATUS_LABEL,
  missionTypeLabel,
  timeLeftLabel,
} from "@/lib/mission-labels";
import { cn } from "@/lib/utils";
import { expireMissions } from "@/server/learning/loop";
import { getMissionDetail } from "@/server/queries/missions";
import { requireLearner } from "@/server/session";

import { MissionActions, NextProjectPanel } from "../project-controls";

export const metadata: Metadata = { title: "Project" };

// Getting the next project from here runs a model call in this route's server action.
export const maxDuration = 120;

export default async function ProjectPage({ params }: PageProps<"/projects/[missionId]">) {
  const { user } = await requireLearner();
  const { missionId } = await params;

  // Past its due time, it opens as over rather than open.
  await expireMissions(user.id);
  const detail = await getMissionDetail(user.id, missionId);
  if (!detail) notFound();
  const { mission, evaluation } = detail;

  const duration = durationLabel(mission.estimatedMinutes);
  const steps = instructionSteps(mission.instructions);
  // Work still to do keeps its actions in the bar pinned above the dock; finished work shows its
  // outcome in the window.
  const open = mission.status === "assigned" || mission.status === "in_progress";
  const left = open ? timeLeftLabel(mission.dueAt) : null;

  return (
    <Screen>
      <ScreenHeader
        title={mission.title}
        subtitle={`${missionTypeLabel(mission.type)} project${duration ? `, ${duration.toLowerCase()}` : ""}.`}
        back={{ href: "/projects", label: "Projects" }}
      />

      {mission.status === "expired" ? (
        <div className="mb-6">
          <NextProjectPanel auto={false} overTitle={mission.title} />
        </div>
      ) : null}

      <section
        aria-label="Mission"
        className="overflow-hidden rounded-lg border-2 border-foreground bg-window shadow-[0_4px_0_var(--color-foreground)] dark:border-rule-strong dark:shadow-window"
      >
        <div
          className={cn(
            "flex items-center justify-between gap-3 border-b-2 border-foreground px-4 py-1.5 text-caption font-semibold dark:border-rule-strong",
            open ? "bg-signal text-signal-foreground" : "bg-raised",
          )}
        >
          <span>
            {MISSION_STATUS_LABEL[mission.status]}
            {left ? `, ${left}` : ""}
          </span>
          <span className="font-mono font-medium">mission/{mission.cadence}</span>
        </div>
        <div className="p-5">
          {mission.difficulty ? (
            <span className="flex items-center gap-2 text-footnote text-muted-foreground">
              <DifficultyCells level={mission.difficulty} />
              Difficulty {mission.difficulty} of 5
            </span>
          ) : null}
          {mission.stack ? <p className="mt-1.5 text-footnote font-semibold">{mission.stack}</p> : null}
          <p className={cn("text-body", (mission.difficulty || mission.stack) && "mt-3")}>
            {mission.objective}
          </p>
          {open || mission.status === "expired" ? null : (
            <div className="mt-5">
              <PrimaryAction
                missionId={mission.id}
                status={mission.status}
                hasEvaluation={Boolean(evaluation)}
              />
            </div>
          )}
        </div>
      </section>

      <ScreenSection title="Why this, now">
        <PipSays mood={mission.status === "submitted" ? "thinking" : "idle"}>{mission.reason}</PipSays>
      </ScreenSection>

      {mission.scenario ? (
        <ScreenSection title="The situation">
          <p className="text-callout">
            <RichText text={mission.scenario} />
          </p>
        </ScreenSection>
      ) : null}

      {mission.requiredKnowledge.length > 0 ? (
        <ScreenSection title="Before you start">
          <ul className="flex flex-col gap-1.5 text-callout">
            {mission.requiredKnowledge.map((item) => (
              <li key={item} className="flex gap-3">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-[1px] bg-foreground" />
                {item}
              </li>
            ))}
          </ul>
        </ScreenSection>
      ) : null}

      <ScreenSection title="Steps">
        <ol className="flex flex-col gap-4">
          {steps.map((step, index) => (
            <li key={index} className="flex gap-3.5">
              <span
                aria-hidden
                className="grid size-7 shrink-0 place-items-center rounded-sm border border-rule-strong font-mono text-footnote font-semibold"
              >
                {index + 1}
              </span>
              <p className="min-w-0 pt-0.5 text-callout wrap-anywhere">
                <RichText text={step} />
              </p>
            </li>
          ))}
        </ol>
      </ScreenSection>

      {mission.acceptanceCriteria.length > 0 ? (
        <ScreenSection title="Done when">
          <ul className="flex flex-col gap-2">
            {mission.acceptanceCriteria.map((item) => (
              <li key={item} className="flex gap-3 text-callout">
                <span
                  aria-hidden
                  className="mt-0.5 size-4 shrink-0 rounded-[3px] border-[1.5px] border-rule-strong"
                />
                <span className="min-w-0">
                  <RichText text={item} />
                </span>
              </li>
            ))}
          </ul>
          {mission.stretchGoal ? (
            <p className="mt-4 rounded-md border border-dashed border-rule-strong px-3.5 py-3 text-callout">
              <span className="font-semibold">Stretch goal: </span>
              <RichText text={mission.stretchGoal} />
            </p>
          ) : null}
        </ScreenSection>
      ) : null}

      <ScreenSection title="Hand in">
        <p className="text-callout">
          <RichText text={mission.deliverable} />
        </p>
      </ScreenSection>

      {mission.evaluationCriteria.length > 0 ? (
        <ScreenSection title="How it's scored">
          <ul className="divide-y divide-rule border-y border-rule">
            {mission.evaluationCriteria.map((criterion) => (
              <li key={criterion.key} className="py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-body font-semibold">{criterion.label}</span>
                  <span className="shrink-0 font-mono text-footnote text-muted-foreground tabular-nums">
                    /{criterion.maxScore}
                  </span>
                </div>
                <p className="mt-0.5 text-footnote text-muted-foreground">{criterion.description}</p>
              </li>
            ))}
          </ul>
        </ScreenSection>
      ) : null}

      {mission.resources.length > 0 ? (
        <ScreenSection title="Start here">
          <ul className="flex flex-col gap-2.5">
            {mission.resources.map((resource) => (
              <li key={resource.title}>
                {resource.url ? (
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex pressable items-start justify-between gap-3 rounded-lg border border-rule bg-window px-4 py-3 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <ResourceText resource={resource} />
                    <ArrowUpRight aria-hidden className="mt-0.5 size-4.5 shrink-0 text-muted-foreground" />
                  </a>
                ) : (
                  <div className="rounded-lg border border-rule bg-window px-4 py-3">
                    <ResourceText resource={resource} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </ScreenSection>
      ) : null}

      {open ? (
        // Stays in reach above the dock while the steps scroll past.
        <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-10 -mx-4 mt-8 bg-linear-to-t from-desk from-60% to-transparent px-4 pt-6 pb-2 sm:-mx-6 sm:px-6 lg:bottom-0 lg:-mx-10 lg:px-10 lg:pb-6">
          <PrimaryAction missionId={mission.id} status={mission.status} hasEvaluation={false} />
        </div>
      ) : null}
    </Screen>
  );
}

function PrimaryAction({
  missionId,
  status,
  hasEvaluation,
}: {
  missionId: string;
  status: "assigned" | "in_progress" | "submitted" | "evaluated" | "skipped" | "expired";
  hasEvaluation: boolean;
}) {
  if (status === "assigned") return <MissionActions missionId={missionId} status="assigned" />;
  if (status === "in_progress") {
    return (
      <div className="flex flex-col gap-2.5">
        <Button asChild size="lg" className="w-full">
          <Link transitionTypes={NAV_FORWARD} href={`/projects/${missionId}/submit`}>
            Hand in your work
          </Link>
        </Button>
        <MissionActions missionId={missionId} status="in_progress" />
      </div>
    );
  }
  if (status === "submitted") {
    return (
      <p className="flex items-center gap-2 text-callout text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" aria-hidden />
        Being reviewed
      </p>
    );
  }
  if (status === "evaluated" && hasEvaluation) {
    return (
      <Button asChild size="lg" className="w-full">
        <Link transitionTypes={NAV_FORWARD} href={`/projects/${missionId}/evaluation`}>
          See the review
        </Link>
      </Button>
    );
  }
  return <p className="text-callout text-muted-foreground">You skipped this one.</p>;
}

function ResourceText({
  resource,
}: {
  resource: { title: string; url?: string; kind: string; note?: string };
}) {
  const host = resource.url ? new URL(resource.url).hostname.replace(/^www\./, "") : null;
  return (
    <span className="min-w-0">
      <span className="block text-body font-semibold">{resource.title}</span>
      <span className="block text-footnote text-muted-foreground">
        {[host, resource.kind].filter(Boolean).join(", ")}
      </span>
      {resource.note ? <span className="mt-1 block text-footnote">{resource.note}</span> : null}
    </span>
  );
}
