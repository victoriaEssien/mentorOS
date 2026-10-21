import { CodeBlock } from "@/components/system/rich-text";
import { parseMarkdown, type Inline } from "@/lib/markdown";
import { cn } from "@/lib/utils";

/** Model-written Markdown (the small subset in lib/markdown), rendered without ever using HTML. */
export function Markdown({ text, className }: { text: string; className?: string }) {
  const blocks = parseMarkdown(text);
  return (
    <div className={cn("flex flex-col gap-3 text-callout", className)}>
      {blocks.map((block, index) => {
        if (block.kind === "code") return <CodeBlock key={index} code={block.code} />;
        if (block.kind === "list") {
          const List = block.ordered ? "ol" : "ul";
          return (
            <List
              key={index}
              className={cn("flex flex-col gap-1.5 pl-5", block.ordered ? "list-decimal" : "list-disc")}
            >
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="pl-1 marker:text-muted-foreground">
                  <Inlines parts={item} />
                </li>
              ))}
            </List>
          );
        }
        return (
          <p key={index}>
            {block.lines.map((line, lineIndex) => (
              <span key={lineIndex}>
                {lineIndex > 0 ? <br /> : null}
                <Inlines parts={line} />
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function Inlines({ parts }: { parts: Inline[] }) {
  return parts.map((part, index) =>
    part.kind === "code" ? (
      <code key={index} className="rounded-xs bg-raised px-1 py-0.5 font-mono text-[0.9em]">
        {part.text}
      </code>
    ) : part.kind === "bold" ? (
      <strong key={index} className="font-semibold">
        {part.text}
      </strong>
    ) : (
      part.text
    ),
  );
}
