import type { Route } from "next";

import { Screen, ScreenHeader } from "@/components/shell/screen";

type PagePlaceholderProps = {
  title: string;
  /** PRD sections this page implements. */
  prd: string;
  /** What this page needs to answer or let the learner do. */
  purpose: string;
  todo?: string[];
  back?: { href: Route; label: string };
};

/** Temporary scaffold shown until a page is built. Delete once the real page exists. */
export function PagePlaceholder({ title, prd, purpose, todo = [], back }: PagePlaceholderProps) {
  return (
    <Screen>
      <ScreenHeader title={title} subtitle={purpose} back={back} />
      <div className="rounded-lg border border-dashed border-rule-strong bg-window p-5">
        <p className="text-footnote font-semibold text-muted-foreground">Not built yet · {prd}</p>
        {todo.length > 0 && (
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-callout">
            {todo.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>
    </Screen>
  );
}
