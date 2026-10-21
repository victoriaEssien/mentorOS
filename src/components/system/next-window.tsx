import { Pip, PipSays, type PipMood } from "@/components/brand/pip";
import { cn } from "@/lib/utils";

/**
 * The one thing to do next, as an app window: a title bar naming the process, Pip saying why in
 * one bubble, the task itself, and the screen's only primary action. One per screen.
 */
export function NextWindow({
  process,
  mood = "idle",
  says,
  title,
  meta,
  actions,
  tone = "signal",
  className,
}: {
  /** Lower-case process name for the title bar, e.g. "mission/daily". */
  process: string;
  mood?: PipMood;
  /** What Pip says: why this is next, in a sentence or two. Omit to show Pip alone. */
  says?: React.ReactNode;
  title: string;
  /** One quiet line under the title: kind, length, status. */
  meta?: React.ReactNode;
  actions: React.ReactNode;
  /** Signal when it asks for action, neutral when it only informs (something is on its way). */
  tone?: "signal" | "neutral";
  className?: string;
}) {
  return (
    <section
      aria-labelledby="next-up-title"
      className={cn(
        "overflow-hidden rounded-lg border-2 border-foreground bg-window shadow-[0_4px_0_var(--color-foreground)] dark:border-rule-strong dark:shadow-window",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-3 border-b-2 border-foreground px-4 py-1.5 text-caption font-semibold dark:border-rule-strong",
          tone === "signal" ? "bg-signal text-signal-foreground" : "bg-raised text-foreground",
        )}
      >
        <span>Next up</span>
        <span className="truncate font-mono font-medium">{process}</span>
      </div>
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        {says ? <PipSays mood={mood}>{says}</PipSays> : <Pip mood={mood} size={52} />}
        <div>
          <h2 id="next-up-title" className="text-title">
            {title}
          </h2>
          {meta ? <p className="mt-1 text-callout text-muted-foreground">{meta}</p> : null}
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end [&>*]:w-full sm:[&>*]:w-auto">
          {actions}
        </div>
      </div>
    </section>
  );
}
