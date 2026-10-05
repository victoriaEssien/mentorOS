import { ChevronLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { cn } from "@/lib/utils";

import { CompactBar } from "./compact-bar";

/**
 * One app screen: a readable column that clears the dock on phones and the safe areas on
 * notched devices. Every screen starts with a ScreenHeader.
 */
export function Screen({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <main
      className={cn(
        "mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+6.5rem)] sm:px-6 lg:px-10 lg:pb-16",
        className,
      )}
    >
      {children}
    </main>
  );
}

type ScreenHeaderProps = {
  title: string;
  /** One line under the title: what this screen is for, in the learner's words. */
  subtitle?: React.ReactNode;
  /** Pushed screens show a back link to their parent. */
  back?: { href: Route; label: string };
  /** Buttons on the right of the bar (icon buttons, usually). */
  actions?: React.ReactNode;
};

/**
 * Large title that collapses into a compact bar as the screen scrolls, like a native app.
 * The bar stays pinned under the status bar and carries the back link and actions.
 */
export function ScreenHeader({ title, subtitle, back, actions }: ScreenHeaderProps) {
  return (
    <header className="-mx-4 sm:-mx-6 lg:-mx-10">
      <CompactBar title={title} titleId="screen-title">
        <div className="flex min-w-0 flex-1 items-center">
          {back ? (
            <Link
              href={back.href}
              className="-ml-2 inline-flex h-11 pressable items-center gap-0.5 rounded-md pr-2 text-callout font-semibold text-foreground outline-none focus-visible:outline-2 focus-visible:outline-ring"
            >
              <ChevronLeft className="size-6" aria-hidden />
              {back.label}
            </Link>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
      </CompactBar>
      <div className="px-4 pt-1 pb-5 sm:px-6 lg:px-10 lg:pt-6">
        <h1 id="screen-title" className="text-display md:text-[2.5rem]">
          {title}
        </h1>
        {subtitle ? <p className="mt-1.5 text-callout text-muted-foreground">{subtitle}</p> : null}
      </div>
    </header>
  );
}

/** A titled group of content on a screen. Headings carry their own weight; no labels above them. */
export function ScreenSection({
  title,
  action,
  className,
  children,
}: {
  title?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("mt-8 first:mt-0", className)}>
      {title ? (
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 className="text-headline">{title}</h2>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}
