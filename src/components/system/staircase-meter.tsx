import { cn } from "@/lib/utils";

import type { Confidence } from "./cell-meter";

/** Which of the ten cells sit in each step, bottom first: 1 + 2 + 3 + 4, like the app mark. */
const STEPS = [[0], [1, 2], [3, 4, 5], [6, 7, 8, 9]];

/**
 * The ten-cell meter folded into the app mark's staircase. It reads like CellMeter (filled cells
 * are evidence, hatched when confidence is low) and marks the next cell to earn in signal yellow.
 * Use it for the one skill a screen is about; lists of skills keep the flat CellMeter.
 */
export function StaircaseMeter({
  value,
  confidence = "high",
  label,
  cell = 16,
  className,
}: {
  /** Ability, 0 to 1. */
  value: number;
  confidence?: Confidence;
  /** Accessible name, e.g. "SQL ability". */
  label: string;
  /** Edge of one cell in pixels. */
  cell?: number;
  className?: string;
}) {
  const clamped = Math.min(1, Math.max(0, value));
  const filled = Math.round(clamped * 10);
  const percent = Math.floor(clamped * 100);
  const gap = Math.max(2, Math.round(cell / 4));

  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-valuetext={`${filled} of 10 cells, ${confidence} confidence`}
      className={cn("flex shrink-0 items-end", className)}
      style={{ gap }}
    >
      {STEPS.map((cells) => (
        <div key={cells[0]} className="flex flex-col-reverse" style={{ gap }}>
          {cells.map((index) => (
            <span
              key={index}
              aria-hidden
              style={{ width: cell, height: cell }}
              className={cn(
                "box-border rounded-[3px]",
                index < filled
                  ? confidence === "low"
                    ? "border border-foreground bg-hatch text-foreground"
                    : "bg-foreground"
                  : index === filled
                    ? "border-2 border-foreground bg-signal"
                    : "bg-muted",
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
