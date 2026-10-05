import { cn } from "@/lib/utils";

/** "mentor" in ink with "OS" selected, the way a system highlights the current item. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center font-bold tracking-tight", className)}>
      mentor
      <span className="ml-[0.08em] rounded-[0.22em] bg-signal px-[0.18em] text-signal-foreground">OS</span>
    </span>
  );
}
