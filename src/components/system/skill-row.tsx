import { ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { NAV_FORWARD } from "@/components/shell/page-transition";
import { CellMeter } from "@/components/system/cell-meter";
import { cn } from "@/lib/utils";
import { abilityBand, confidenceBand, type AbilityBand } from "@/server/learning/skill-estimate";

type Estimate = { ability: number; confidence: number; evidenceCount: number };

const BAND_LABEL: Record<AbilityBand, string> = {
  strong: "Strong",
  intermediate: "Intermediate",
  developing: "Developing",
  beginner: "Beginner",
};

export const abilityLabel = (ability: number) => BAND_LABEL[abilityBand(ability)];

/** "Low confidence, from 1 answer". The count is what makes the confidence believable. */
export function confidenceCaption(estimate: Estimate, noun: { one: string; many: string }) {
  const band = confidenceBand(estimate.confidence);
  const level = band === "high" ? "High" : band === "medium" ? "Medium" : "Low";
  const count = estimate.evidenceCount;
  return `${level} confidence, from ${count} ${count === 1 ? noun.one : noun.many}`;
}

/**
 * One skill: name, band and the ten-cell meter. A skill nothing has measured yet keeps an empty
 * meter and says so, rather than showing a guess.
 */
export function SkillRow<T extends string>({
  name,
  estimate,
  href,
  caption,
  animate = false,
  delay,
}: {
  name: string;
  estimate: Estimate | null;
  href?: Route<T>;
  caption?: string;
  animate?: boolean;
  delay?: number;
}) {
  const label = estimate ? abilityLabel(estimate.ability) : "Not measured";
  const body = (
    <>
      <span className="flex items-baseline justify-between gap-3">
        <span className={cn("text-body font-semibold", !estimate && "text-muted-foreground")}>{name}</span>
        <span className="flex shrink-0 items-center gap-0.5 text-footnote text-muted-foreground">
          {label}
          {href ? <ChevronRight className="-mr-1 size-4 self-center" aria-hidden /> : null}
        </span>
      </span>
      <CellMeter
        value={estimate?.ability ?? 0}
        confidence={estimate ? confidenceBand(estimate.confidence) : "high"}
        label={`${name}: ${label.toLowerCase()}`}
        animate={animate}
        delay={delay}
        className={cn("mt-2", !estimate && "opacity-60")}
      />
      {caption ? <span className="mt-1.5 block text-caption text-muted-foreground">{caption}</span> : null}
    </>
  );

  return href ? (
    <Link
      transitionTypes={NAV_FORWARD}
      href={href}
      className="block pressable rounded-sm py-3.5 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {body}
    </Link>
  ) : (
    <div className="py-3.5">{body}</div>
  );
}
