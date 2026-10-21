import { cn } from "@/lib/utils";

/**
 * Model-written text with `inline code` spans and line breaks preserved. Deliberately tiny: no
 * HTML is ever injected, so generated text cannot become markup.
 */
export function RichText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(`[^`\n]+`)/g);
  return (
    <span className={cn("whitespace-pre-line", className)}>
      {parts.map((part, index) =>
        part.startsWith("`") && part.endsWith("`") && part.length > 2 ? (
          <code key={index} className="rounded-xs bg-raised px-1 py-0.5 font-mono text-[0.9em]">
            {part.slice(1, -1)}
          </code>
        ) : (
          part
        ),
      )}
    </span>
  );
}

/** A code listing with line numbers that scrolls sideways instead of wrapping. */
export function CodeBlock({ code, className }: { code: string; className?: string }) {
  const lines = code.replace(/\n+$/, "").split("\n");
  return (
    <pre
      className={cn(
        "[scrollbar-width:thin] overflow-x-auto rounded-md border border-rule bg-raised py-3 font-mono text-[0.8125rem] leading-relaxed",
        className,
      )}
    >
      <code className="table min-w-full">
        {lines.map((line, index) => (
          <span key={index} className="table-row">
            <span
              aria-hidden
              className="table-cell w-0 pr-4 pl-3.5 text-right whitespace-nowrap text-muted-foreground/70 tabular-nums select-none"
            >
              {index + 1}
            </span>
            <span className="table-cell pr-4 whitespace-pre">{line || " "}</span>
          </span>
        ))}
      </code>
    </pre>
  );
}
