import { cn } from "@/lib/utils";

/** Difficulty 1 to 5 as five small cells, the same language as the skill meter. */
export function DifficultyCells({ level, className }: { level: number; className?: string }) {
  const filled = Math.min(5, Math.max(0, Math.round(level)));
  return (
    <span
      role="img"
      aria-label={`Difficulty ${filled} of 5`}
      className={cn("inline-grid grid-cols-5 gap-[2px] align-middle", className)}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <span
          key={index}
          aria-hidden
          className={cn(
            "h-2.5 w-2 rounded-[1px]",
            index < filled ? "bg-foreground" : "border border-rule-strong",
          )}
        />
      ))}
    </span>
  );
}
