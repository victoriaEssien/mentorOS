import { CircleCheck } from "lucide-react";

import { cn } from "@/lib/utils";

/** Good news about a form: something went through. The calm counterpart of FormAlert. */
export function FormNotice({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-2.5 rounded-md border border-pass/30 bg-pass/10 px-3.5 py-3 text-callout text-foreground",
        className,
      )}
    >
      <CircleCheck className="mt-0.5 size-4.5 shrink-0 text-pass" aria-hidden />
      <p>{children}</p>
    </div>
  );
}
