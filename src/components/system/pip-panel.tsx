import { Pip, type PipMood } from "@/components/brand/pip";
import { cn } from "@/lib/utils";

/**
 * A window where Pip tells the learner about a state: nothing planned yet, something on its way,
 * something that needs doing first. Pip's mood matches the state; the action, if any, sits below.
 */
export function PipPanel({
  mood = "idle",
  title,
  action,
  status = false,
  className,
  children,
}: {
  mood?: PipMood;
  title: string;
  action?: React.ReactNode;
  /** True while the panel reports work in progress, so screen readers announce it. */
  status?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      role={status ? "status" : undefined}
      className={cn("rounded-lg border border-rule bg-window p-5 shadow-window", className)}
    >
      <div className="flex items-start gap-4">
        <Pip mood={mood} size={56} />
        <div className="min-w-0 flex-1 pt-1">
          <p className="text-headline">{title}</p>
          {children ? <div className="mt-1 text-callout text-muted-foreground">{children}</div> : null}
        </div>
      </div>
      {action ? <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">{action}</div> : null}
    </div>
  );
}
