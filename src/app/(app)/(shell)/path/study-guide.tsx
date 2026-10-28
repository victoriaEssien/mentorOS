import { ArrowUpRight } from "lucide-react";

import type { StudyGuide } from "@/db/schema/learning";

/**
 * The current step's study guide: what to understand (in order), what to read, small exercises
 * before the mission, the usual mistakes, and how to tell it has landed.
 */
export function StudyGuideView({ guide }: { guide: StudyGuide }) {
  return (
    <div className="divide-y divide-rule overflow-hidden rounded-lg border border-rule bg-window shadow-window">
      <p className="p-5 text-body">{guide.summary}</p>

      <GuidePart title="Learn, in this order">
        <ol className="flex flex-col gap-3">
          {guide.learn.map((item, index) => (
            <li key={item.idea} className="flex gap-3">
              <span className="w-4 shrink-0 pt-px font-mono text-footnote text-muted-foreground tabular-nums">
                {index + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-callout font-semibold">{item.idea}</span>
                <span className="mt-0.5 block text-footnote text-muted-foreground">{item.why}</span>
              </span>
            </li>
          ))}
        </ol>
      </GuidePart>

      <GuidePart title="Read">
        <ul className="flex flex-col gap-2.5">
          {guide.read.map((resource) => (
            <li key={resource.title}>
              {resource.url ? (
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 text-callout font-semibold underline decoration-rule-strong underline-offset-4 hover:decoration-foreground"
                >
                  {resource.title}
                  <ArrowUpRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                </a>
              ) : (
                <span className="text-callout font-semibold">{resource.title}</span>
              )}
              <span className="block text-footnote text-muted-foreground">
                {[resource.kind, resource.note].filter(Boolean).join(". ")}
              </span>
            </li>
          ))}
        </ul>
      </GuidePart>

      <GuidePart title="Try these first">
        <ol className="flex flex-col gap-2.5">
          {guide.practise.map((exercise, index) => (
            <li key={exercise} className="flex gap-3 text-callout">
              <span className="w-4 shrink-0 pt-px font-mono text-footnote text-muted-foreground tabular-nums">
                {index + 1}
              </span>
              <span className="min-w-0">{exercise}</span>
            </li>
          ))}
        </ol>
      </GuidePart>

      {guide.pitfalls.length > 0 ? (
        <GuidePart title="Watch for">
          <Bullets items={guide.pitfalls} />
        </GuidePart>
      ) : null}

      <GuidePart title="You've got it when you can">
        <Bullets items={guide.checkpoints} />
      </GuidePart>
    </div>
  );
}

function GuidePart({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="p-5">
      <h3 className="mb-3 text-caption font-semibold text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-callout">
          <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-[1px] bg-foreground" />
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ul>
  );
}
