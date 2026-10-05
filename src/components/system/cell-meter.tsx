import { cn } from "@/lib/utils";

export type Confidence = "low" | "medium" | "high";

/**
 * The ten-cell ability meter (PRD §10's ████████░░). Filled cells are evidence; empty cells are
 * hollow, like the next cell in the app mark. When confidence is low the filled cells are hatched:
 * the estimate exists, but there isn't enough evidence to stand behind it yet.
 */
export function CellMeter({
  value,
  confidence = "high",
  label,
  animate = false,
  className,
}: {
  /** Ability, 0 to 1. */
  value: number;
  confidence?: Confidence;
  /** Accessible name, e.g. "SQL ability". */
  label: string;
  /** Fill cell by cell on mount. Use for one moment per screen, never on every meter. */
  animate?: boolean;
  className?: string;
}) {
  const clamped = Math.min(1, Math.max(0, value));
  const filled = Math.round(clamped * 10);
  const percent = Math.round(clamped * 100);

  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-valuetext={`${percent}%, ${confidence} confidence`}
      className={cn("grid grid-cols-10 gap-[3px]", className)}
    >
      {Array.from({ length: 10 }, (_, index) => {
        const on = index < filled;
        return (
          <span
            key={index}
            aria-hidden
            style={animate && on ? ({ animationDelay: `${index * 55}ms` } as React.CSSProperties) : undefined}
            className={cn(
              "h-3 origin-bottom rounded-xs",
              on
                ? confidence === "low"
                  ? "border border-foreground bg-hatch text-foreground"
                  : "bg-foreground"
                : "border border-rule-strong",
              animate && on && "animate-cell-fill",
            )}
          />
        );
      })}
    </div>
  );
}
