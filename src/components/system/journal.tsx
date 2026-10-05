import { cn } from "@/lib/utils";

export type JournalEntry = {
  id: string;
  /** Short time or day label, e.g. "09:14" or "Mon". */
  when: string;
  skill: string;
  /** Change this observation made to the estimate, -1 to 1. Omit when it only added confidence. */
  delta?: number;
  text: string;
};

/**
 * The evidence journal: append-only lines, newest first, like a system log. Times and deltas are
 * data and set in mono; what happened is set in the UI face.
 */
export function Journal({ entries, className }: { entries: JournalEntry[]; className?: string }) {
  return (
    <ol className={cn("divide-y divide-rule", className)}>
      {entries.map((entry) => (
        <li key={entry.id} className="grid grid-cols-[3rem_1fr_auto] items-baseline gap-x-3 py-2.5">
          <span className="font-mono text-caption text-muted-foreground tabular-nums">{entry.when}</span>
          <p className="min-w-0 text-footnote">
            <span className="font-mono font-semibold">{entry.skill}</span>{" "}
            <span className="text-muted-foreground">{entry.text}</span>
          </p>
          {entry.delta === undefined ? (
            <span />
          ) : (
            <span
              className={cn(
                "font-mono text-caption font-semibold tabular-nums",
                entry.delta >= 0 ? "text-pass" : "text-fail",
              )}
            >
              {formatDelta(entry.delta)}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

/** +0.08 / −0.05, with a true minus sign. */
export function formatDelta(delta: number) {
  const sign = delta >= 0 ? "+" : "−";
  return `${sign}${Math.abs(delta).toFixed(2)}`;
}
