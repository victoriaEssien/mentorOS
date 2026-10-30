import { Check, CircleHelp, X } from "lucide-react";
import Link from "next/link";

import { Pip, PipSays } from "@/components/brand/pip";
import { PipStaircase } from "@/components/brand/pip-staircase";
import { Reveal } from "@/components/system/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { THEMES } from "@/lib/themes";
import { cn } from "@/lib/utils";

const loop = [
  { name: "Theme", detail: "A week or two on one subject, chosen for you, each building on the last." },
  { name: "Research", detail: "One new concept a day. Read the docs, watch a talk, whatever works for you." },
  { name: "Explain", detail: "Write it back in your own words: how it works and why, not just its name." },
  { name: "Graded", detail: "Point by point against a checklist, with a reference explanation to compare." },
  { name: "Return", detail: "Shaky concepts come back in a day or two, asked a new way, until they stick." },
  { name: "Build", detail: "Each theme ends with a project, reviewed against its brief from your repo." },
];

const examplePoints = [
  { status: "hit", point: "The client sends the same key with every retry of one request." },
  { status: "hit", point: "The server stores the first response against the key." },
  { status: "missed", point: "A retry with the key gets the stored response, without running again." },
  { status: "wrong", point: "Keys expire after a window, so storage doesn't grow forever." },
] as const;

const POINT = {
  hit: { label: "Hit", icon: Check, className: "text-pass" },
  missed: { label: "Missed", icon: CircleHelp, className: "text-muted-foreground" },
  wrong: { label: "Wrong", icon: X, className: "text-fail" },
} as const;

const SECTION_TITLE = "text-3xl font-extrabold tracking-tight sm:text-4xl";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Loop />
      <Graded />
      <ProjectsAndReviews />
      <Mentor />
      <Themes />
      <Close />
    </>
  );
}

function Hero() {
  return (
    <section className="mx-auto grid w-full max-w-6xl gap-12 px-5 pt-8 pb-16 sm:px-8 sm:pt-14 lg:grid-cols-12 lg:items-center lg:gap-10 lg:pt-16 lg:pb-24">
      <div className="lg:col-span-6">
        <h1 className="text-[2.375rem] leading-[1.04] font-extrabold tracking-[-0.03em] sm:text-5xl lg:text-[3.6rem]">
          Learn it well enough to explain it. Then build it.
        </h1>
        <p className="mt-5 max-w-136 text-lg leading-relaxed text-muted-foreground">
          A theme every week, from HTTP to payments to system design. One concept a day to research and
          explain in your own words, graded point by point. A project at the end of every theme.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/sign-up">Start your first week</Link>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <a href="#how-it-works">How it works</a>
          </Button>
        </div>
        <p className="mt-4 text-footnote text-muted-foreground">Free while it&apos;s new.</p>
      </div>

      <figure className="relative mx-auto w-full max-w-md lg:col-span-6 lg:max-w-none lg:pl-12">
        <div className="hero-say relative z-10 max-w-64 rounded-xl border-2 border-foreground bg-window px-4 py-3.5 text-callout shadow-window dark:border-rule-strong">
          <p className="font-semibold">Hi, I&apos;m Pip.</p>
          <p className="mt-1">
            I&apos;ll pick what you learn next, then tell you straight whether your explanation holds up.
          </p>
          <span
            aria-hidden
            className="absolute -right-2.5 bottom-7 size-4 rotate-45 border-t-2 border-r-2 border-foreground bg-window dark:border-rule-strong"
          />
        </div>
        {/* Stacked under the bubble on phones; tucked beneath it once there's room beside Pip. */}
        <PipStaircase
          build
          label="Pip, the mentor, standing on the third step of a staircase of cells, beside the hollow cell it hasn't earned yet"
          className="mt-2 ml-auto w-[76%] sm:-mt-20"
        />
      </figure>
    </section>
  );
}

/** The loop as the staircase it is: each step stands on the one before it. */
function Loop() {
  return (
    <section id="how-it-works" className="scroll-mt-6 border-y border-rule bg-window">
      <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
        <h2 className={cn("max-w-xl", SECTION_TITLE)}>One loop, every day.</h2>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
          Each step climbs on the one before it. You do the research; mentorOS keeps the order, the grading
          and the schedule.
        </p>
        <Reveal>
          <ol className="mt-10 grid gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-y-8 lg:grid-cols-6">
            {loop.map((step, index) => {
              const last = index === loop.length - 1;
              return (
                // A cell beside its text on narrow screens; on wide ones the cells climb, all
                // standing on one baseline so the steps rise evenly.
                <li
                  key={step.name}
                  style={{ "--i": index } as React.CSSProperties}
                  className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-4 lg:flex lg:flex-col"
                >
                  <div aria-hidden className="row-span-2 lg:flex lg:h-40 lg:items-end">
                    <span
                      data-reveal-item="grow"
                      style={{ "--step": index } as React.CSSProperties}
                      className={cn(
                        "grid size-11 place-items-center rounded-md font-mono text-headline lg:h-[calc(3.5rem+var(--step)*1.25rem)] lg:w-full",
                        last
                          ? "border-4 border-foreground bg-signal text-signal-foreground"
                          : "bg-foreground text-signal dark:text-background",
                      )}
                    >
                      {index + 1}
                    </span>
                  </div>
                  <p data-reveal-item className="text-headline lg:mt-3">
                    <span className="sr-only">{index + 1}. </span>
                    {step.name}
                  </p>
                  <p data-reveal-item className="mt-1 text-footnote text-muted-foreground">
                    {step.detail}
                  </p>
                </li>
              );
            })}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}

function Graded() {
  return (
    <section className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-12 lg:items-center lg:py-24">
      <div className="lg:col-span-5">
        <h2 className={SECTION_TITLE}>Graded on how it works, not the words you use.</h2>
        <p className="mt-4 max-w-md text-lg leading-relaxed text-muted-foreground">
          Every concept has a checklist of the points a good explanation makes, written once and kept. Yours is
          marked against it: hit, missed or wrong. The right terms without the mechanism don&apos;t count.
          Then one question on how it works, to see if you can reason it through.
        </p>
      </div>
      <Reveal className="lg:col-span-6 lg:col-start-7">
        <figure aria-label="Example: an explanation graded point by point, with Pip's follow-up question">
          <div className="rounded-lg border border-rule bg-window p-5 shadow-window">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-headline">Idempotency keys</p>
                <p className="text-footnote text-muted-foreground">HTTP and APIs, day 4</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge>Example</Badge>
                <Badge variant="partial">Partly there</Badge>
              </div>
            </div>
            {/* The points land one at a time, the way they're marked. */}
            <div data-reveal-lines>
              <ol className="mt-4 flex flex-col gap-2.5 border-t border-rule pt-4">
                {examplePoints.map((entry, index) => {
                  const status = POINT[entry.status];
                  const Icon = status.icon;
                  return (
                    <li
                      key={entry.point}
                      style={{ "--row": index } as React.CSSProperties}
                      className="flex items-start gap-2.5 text-callout"
                    >
                      <Icon aria-hidden className={cn("mt-0.5 size-4.5 shrink-0", status.className)} />
                      <span>
                        <span className="sr-only">{status.label}: </span>
                        {entry.point}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
          <div
            data-reveal-item="pop"
            style={{ "--i": 15 } as React.CSSProperties}
            className="relative -mt-4 ml-6 flex items-start gap-4 rounded-lg border-2 border-foreground bg-window p-4 shadow-[0_4px_0_var(--color-foreground)] sm:ml-12 dark:border-rule-strong dark:shadow-window"
          >
            <Pip mood="notYet" size={56} />
            <div>
              <p className="text-headline">One more question.</p>
              <p className="mt-1 text-callout text-muted-foreground">
                The first request is still running when the retry arrives with the same key. What should the
                server do?
              </p>
            </div>
          </div>
        </figure>
      </Reveal>
    </section>
  );
}

function ProjectsAndReviews() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 pb-16 sm:px-8 lg:pb-24">
      <Reveal className="grid gap-4 lg:grid-cols-5">
        <article className="rounded-lg border border-rule bg-window p-6 lg:col-span-3 lg:p-8">
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">A project per theme.</h2>
          <p className="mt-3 max-w-lg text-callout text-muted-foreground">
            Something real to build with what the theme covered: a stack, concrete requirements and a
            definition of done. Hand in the repo and it&apos;s reviewed against the brief. Then you get a draft
            post for X and LinkedIn about what you built and what was hard.
          </p>
          <div
            aria-label="Example project"
            data-reveal-item
            style={{ "--i": 1 } as React.CSSProperties}
            className="mt-6 overflow-hidden rounded-lg border-2 border-foreground dark:border-rule-strong"
          >
            <div className="flex items-center justify-between gap-3 border-b-2 border-foreground bg-signal px-4 py-1.5 text-caption font-semibold text-signal-foreground dark:border-rule-strong">
              <span>Not started</span>
              <span className="font-medium">Payments, two weeks</span>
            </div>
            <div className="flex flex-col gap-3 p-4">
              <PipSays size={52}>
                You&apos;ve explained webhooks and idempotency. Now make a checkout that survives both.
              </PipSays>
              <p className="text-headline">Take a payment, then trust only the webhook</p>
              <p className="-mt-2 text-footnote text-muted-foreground">
                Next.js and Stripe in test mode. Done when an order is marked paid by the webhook alone, and
                a replayed event changes nothing.
              </p>
            </div>
          </div>
        </article>
        <article className="flex flex-col justify-between gap-6 rounded-lg bg-console p-6 text-console-foreground lg:col-span-2 lg:p-8 dark:border dark:border-rule">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">It comes back.</h2>
            <p className="mt-3 text-callout text-console-foreground/70">
              Solid concepts return in 3, 7, 14, then 30 days. Shaky ones come back tomorrow. Each time
              it&apos;s a new scenario, so you can&apos;t recite last time&apos;s answer.
            </p>
          </div>
          {/* A review arrives a beat after the rest. */}
          <div
            data-reveal-item="pop"
            style={{ "--i": 6 } as React.CSSProperties}
            className="flex items-start gap-3 rounded-lg bg-window p-4 text-foreground"
          >
            <Pip mood="alert" size={52} />
            <div>
              <p className="text-headline">Review, asked a new way.</p>
              <p className="mt-1 text-footnote text-muted-foreground">
                A user pays, closes the tab, and your webhook arrives twice. Walk through what your server
                does each time.
              </p>
            </div>
          </div>
        </article>
      </Reveal>
    </section>
  );
}

/**
 * One line of the example conversation, the learner's on the right, Pip's on the left. Lines arrive
 * in turn (their `at`), the way the conversation would.
 */
function Line({ from, at, children }: { from: "you" | "pip"; at: number; children: React.ReactNode }) {
  const turn = { "--i": at } as React.CSSProperties;
  if (from === "you") {
    return (
      <p
        data-reveal-item
        style={turn}
        className="ml-auto w-fit max-w-[85%] rounded-lg rounded-br-xs bg-foreground px-3.5 py-2.5 text-callout text-background"
      >
        {children}
      </p>
    );
  }
  return (
    <div data-reveal-item style={turn} className="flex items-start gap-2.5">
      <Pip frame="body" size={30} className="mt-0.5" />
      <p className="w-fit max-w-[85%] rounded-lg rounded-tl-xs bg-raised px-3.5 py-2.5 text-callout">
        {children}
      </p>
    </div>
  );
}

function Mentor() {
  return (
    <section className="border-y border-rule bg-window">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-12 lg:items-center lg:py-20">
        <div className="lg:col-span-5">
          <h2 className={SECTION_TITLE}>A mentor that asks before it tells.</h2>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-muted-foreground">
            Pip knows your theme, your project and the concepts you&apos;re shaky on. Ask why something works,
            paste code you don&apos;t understand, or think a design through out loud.
          </p>
        </div>
        {/* Lines arrive about a beat apart, so the conversation plays out instead of appearing whole. */}
        <Reveal
          className="lg:col-span-6 lg:col-start-7"
          style={{ "--reveal-gap": "750ms" } as React.CSSProperties}
        >
          <figure aria-label="Example conversation with Pip" className="flex flex-col gap-3">
            <Line from="you" at={0}>
              Why does my count drop when I join orders to customers?
            </Line>
            <Line from="pip" at={1}>
              Before I explain: what do you think happens to a customer with no orders when the join runs?
            </Line>
            <Line from="you" at={2}>
              It gets dropped?
            </Line>
            <Line from="pip" at={3}>
              Exactly. A plain JOIN only keeps rows that match on both sides. Try{" "}
              <code className="rounded-xs bg-window px-1 font-mono text-footnote">LEFT JOIN</code> and count
              the orders side.
            </Line>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}

/** The curriculum, in order: each theme starts the week after the one before ends. */
function Themes() {
  const starts = THEMES.reduce<number[]>(
    (weeks, theme, index) => [...weeks, index === 0 ? 1 : weeks[index - 1] + THEMES[index - 1].weeks],
    [],
  );
  const total = THEMES.reduce((sum, theme) => sum + theme.weeks, 0);
  const withDocs = THEMES.filter((theme) => theme.docs.length > 0).map((theme) => theme.title.toLowerCase());
  const docsList = `${withDocs.slice(0, -1).join(", ")} and ${withDocs.at(-1)}`;
  return (
    <section className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-12 lg:py-20">
      <div className="lg:col-span-4">
        <h2 className={SECTION_TITLE}>{THEMES.length} themes, in order.</h2>
        <p className="mt-4 text-callout text-muted-foreground">
          {total} weeks across the backend and the frontend, each theme standing on the ones before it. In{" "}
          {docsList}, the official docs sit beside every reference explanation.
        </p>
      </div>
      <ol className="grid gap-x-8 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-3">
        {THEMES.map((theme, index) => (
          <li key={theme.slug} className="flex items-baseline gap-3 border-t border-rule py-3">
            <span className="w-14 shrink-0 text-footnote text-muted-foreground tabular-nums">
              {theme.weeks === 2 ? `Wk ${starts[index]}-${starts[index] + 1}` : `Wk ${starts[index]}`}
            </span>
            <span className="text-callout font-semibold">{theme.title}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Close() {
  return (
    <section className="bg-signal text-signal-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-16 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:py-20">
        <h2 className="max-w-xl text-3xl font-extrabold tracking-tight sm:text-4xl">
          Explain one thing properly today.
        </h2>
        <Link
          href="/sign-up"
          className="inline-flex h-12 shrink-0 pressable items-center justify-center rounded-md bg-signal-foreground px-6 text-headline text-signal outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-foreground"
        >
          Start your first week
        </Link>
      </div>
    </section>
  );
}
