import { cn } from "@/lib/utils";

/**
 * A system alert rendered in place (the interactive version is AlertDialog). The mentor's
 * interruptions share one shape: an icon tile, one plain-sentence title, a short message, and at
 * most two actions with the default on the right.
 */
export function AlertCard({
  icon,
  title,
  actions,
  tone = "signal",
  className,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  actions?: React.ReactNode;
  /** Signal when the alert asks for action, neutral when it only informs. */
  tone?: "signal" | "neutral";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-lg border border-rule bg-window p-5 shadow-window", className)}>
      <div className="grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-1.5">
        <div
          className={cn(
            "row-span-2 grid size-11 place-items-center rounded-md [&_svg]:size-5.5",
            tone === "signal" ? "bg-signal text-signal-foreground" : "bg-raised text-foreground",
          )}
        >
          {icon}
        </div>
        <p className="text-headline">{title}</p>
        <div className="text-callout text-muted-foreground">{children}</div>
      </div>
      {actions ? (
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{actions}</div>
      ) : null}
    </div>
  );
}
