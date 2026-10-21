import { CircleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

/** Form-level problem: what went wrong and what to do about it, announced as it appears. */
export function FormAlert({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2.5 rounded-md border border-fail/30 bg-fail/10 px-3.5 py-3 text-callout text-foreground",
        className,
      )}
    >
      <CircleAlert className="mt-0.5 size-4.5 shrink-0 text-fail" aria-hidden />
      <p>{children}</p>
    </div>
  );
}
