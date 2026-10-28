import Link from "next/link";

import { Pip, PipSays } from "@/components/brand/pip";
import { PipStaircase } from "@/components/brand/pip-staircase";
import { CellMeter } from "@/components/system/cell-meter";
import { Journal, type JournalEntry } from "@/components/system/journal";
import { Reveal } from "@/components/system/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const loop = [
  {
    name: "Assess",
    detail: "A diagnostic with real questions: code to read, bugs to find, scenarios to reason through.",
  },
  { name: "Plan", detail: "A short path where every step says why it is there." },
  { name: "Build", detail: "Missions instead of lessons. You make something and hand it in." },
  {
    name: "Evaluate",
    detail: "What you did well, what needs work, the idea behind it, and what to do next.",
  },
  { name: "Adapt", detail: "Your skill estimates move with the evidence, and so does your next mission." },
  { name: "Recheck", detail: "Weeks later, an unannounced question finds out whether it stuck." },
];

const tracks = [
  {
    name: "Software Engineering",
    detail: "Programming, web, databases and systems, built the way strong teams build them.",
  },
  {
    name: "Data Structures & Algorithms",
    detail: "The patterns coding interviews test, from arrays and hashing to dynamic programming.",
  },
  { name: "Computer Science Foundations", detail: "Computer systems, memory, networks and theory." },
];

const exampleJournal: JournalEntry[] = [
  { id: "1", when: "Sat", label: "sql", delta: 0.05, text: "Knowledge check on indexes: pass" },
  { id: "2", when: "Fri", label: "sql", delta: -0.06, text: "Surprise check on isolation levels: missed" },
  { id: "3", when: "Wed", label: "sql", delta: 0.04, text: "Mission, schema for a task app: partial" },
  { id: "4", when: "Mon", label: "sql", delta: 0.12, text: "Diagnostic, JOIN scenario: strong" },
];

const SECTION_TITLE = "text-3xl font-extrabold tracking-tight sm:text-4xl";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Loop />
      <Receipts />
      <MissionsAndChecks />
      <Mentor />
      <Tracks />
      <Close />
    </>
  );
}

function Hero() {
  return (
    <section className="mx-auto grid w-full max-w-6xl gap-12 px-5 pt-8 pb-16 sm:px-8 sm:pt-14 lg:grid-cols-12 lg:items-center lg:gap-10 lg:pt-16 lg:pb-24">
      <div className="lg:col-span-6">
        <h1 className="text-[2.375rem] leading-[1.04] font-extrabold tracking-[-0.03em] sm:text-5xl lg:text-[3.6rem]">
          It tests you first. Then it decides what you build next.
        </h1>
        <p className="mt-5 max-w-136 text-lg leading-relaxed text-muted-foreground">
          mentorOS finds what you can actually do, assigns missions that close the gaps, and checks weeks
          later that it stuck.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/sign-up">Start your assessment</Link>
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
            I&apos;ll find out what you already know, then hand you real work to prove the rest.
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
        <h2 className={cn("max-w-xl", SECTION_TITLE)}>One loop, run on your evidence.</h2>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
          Each step climbs on the one before it. Nothing moves until there&apos;s evidence that it should.
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

function Receipts() {
  return (
    <section className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-12 lg:items-center lg:py-24">
      <div className="lg:col-span-5">
        <h2 className={SECTION_TITLE}>Every score has receipts.</h2>
        <p className="mt-4 max-w-md text-lg leading-relaxed text-muted-foreground">
          A percentage means nothing on its own. Each estimate keeps the answers, missions and checks that
          moved it, and says how sure it is. When the evidence is thin, Pip says not yet, and shows you where
          to start.
        </p>
      </div>
      <Reveal className="lg:col-span-6 lg:col-start-7">
        <figure aria-label="Example: a skill estimate with its evidence, and Pip declining to move on yet">
          <div className="rounded-lg border border-rule bg-window p-5 shadow-window">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-headline">SQL</p>
                <p className="text-footnote text-muted-foreground">Intermediate, medium confidence</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge>Example</Badge>
                <span className="font-mono text-2xl font-semibold tabular-nums">68%</span>
              </div>
            </div>
            {/* The meter fills, then the evidence behind it appends line by line, like a log. */}
            <div data-reveal-cells className="mt-4">
              <CellMeter value={0.68} confidence="medium" label="SQL ability" />
            </div>
            <div data-reveal-lines>
              <Journal entries={exampleJournal} className="mt-4 border-t border-rule" />
            </div>
          </div>
          <div
            data-reveal-item="pop"
            style={{ "--i": 15 } as React.CSSProperties}
            className="relative -mt-4 ml-6 flex items-start gap-4 rounded-lg border-2 border-foreground bg-window p-4 shadow-[0_4px_0_var(--color-foreground)] sm:ml-12 dark:border-rule-strong dark:shadow-window"
          >
            <Pip mood="notYet" size={56} />
            <div>
              <p className="text-headline">Not yet.</p>
              <p className="mt-1 text-callout text-muted-foreground">
                Caching builds on HTTP, and your HTTP evidence is still thin: two checks, both partial. Start
                there.
              </p>
            </div>
          </div>
        </figure>
      </Reveal>
    </section>
  );
}

function MissionsAndChecks() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 pb-16 sm:px-8 lg:pb-24">
      <Reveal className="grid gap-4 lg:grid-cols-5">
        <article className="rounded-lg border border-rule bg-window p-6 lg:col-span-3 lg:p-8">
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Missions, not lessons.</h2>
          <p className="mt-3 max-w-lg text-callout text-muted-foreground">
            Instead of chapter four, you get something to make, a reason it is next, and the criteria it will
            be judged on.
          </p>
          <div
            aria-label="Example mission"
            data-reveal-item
            style={{ "--i": 1 } as React.CSSProperties}
            className="mt-6 overflow-hidden rounded-lg border-2 border-foreground dark:border-rule-strong"
          >
            <div className="flex items-center justify-between gap-3 border-b-2 border-foreground bg-signal px-4 py-1.5 text-caption font-semibold text-signal-foreground dark:border-rule-strong">
              <span>Not started</span>
              <span className="font-mono font-medium">mission/daily</span>
            </div>
            <div className="flex flex-col gap-3 p-4">
              <PipSays size={52}>
                Your diagnostic showed you can call APIs but can&apos;t yet explain what travels over the
                wire.
              </PipSays>
              <p className="text-headline">Build a tiny HTTP server</p>
              <p className="-mt-2 text-footnote text-muted-foreground">
                Build mission, about 60 minutes. Hand in a repo link and a short write-up.
              </p>
            </div>
          </div>
        </article>
        <article className="flex flex-col justify-between gap-6 rounded-lg bg-console p-6 text-console-foreground lg:col-span-2 lg:p-8 dark:border dark:border-rule">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">It checks back.</h2>
            <p className="mt-3 text-callout text-console-foreground/70">
              Weeks after you learn something, a short unannounced question measures what you kept, not what
              you finished.
            </p>
          </div>
          {/* Unannounced, so it pops in a beat after the rest. */}
          <div
            data-reveal-item="pop"
            style={{ "--i": 6 } as React.CSSProperties}
            className="flex items-start gap-3 rounded-lg bg-window p-4 text-foreground"
          >
            <Pip mood="alert" size={52} />
            <div>
              <p className="text-headline">Surprise check, five minutes.</p>
              <p className="mt-1 text-footnote text-muted-foreground">
                Explain what happens between typing example.com and the page appearing.
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
            Pip knows your skills, your path and the mistakes you&apos;ve made. Ask why something works, ask
            to be tested, or ask for a hint. Inside an assessment, a hint never gives the answer away.
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

function Tracks() {
  return (
    <section className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-12 lg:py-20">
      <div className="lg:col-span-4">
        <h2 className={SECTION_TITLE}>Three tracks, one bar.</h2>
        <p className="mt-4 text-callout text-muted-foreground">
          Everyone works toward the bar top engineering interviews set. Security, data and interface design
          come up inside a mission when the work needs them, like hashing passwords in a login you build.
        </p>
      </div>
      <ul className="grid gap-x-8 sm:grid-cols-3 lg:col-span-8">
        {tracks.map((track) => (
          <li key={track.name} className="border-t border-rule py-4">
            <p className="text-headline">{track.name}</p>
            <p className="mt-1 text-footnote text-muted-foreground">{track.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Close() {
  return (
    <section className="bg-signal text-signal-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-16 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:py-20">
        <h2 className="max-w-xl text-3xl font-extrabold tracking-tight sm:text-4xl">
          Find out what you actually know.
        </h2>
        <Link
          href="/sign-up"
          className="inline-flex h-12 shrink-0 pressable items-center justify-center rounded-md bg-signal-foreground px-6 text-headline text-signal outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-foreground"
        >
          Start your assessment
        </Link>
      </div>
    </section>
  );
}
