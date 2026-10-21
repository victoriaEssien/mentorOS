import { LockKeyhole, Timer } from "lucide-react";
import Link from "next/link";

import { Pip } from "@/components/brand/pip";
import { Wordmark } from "@/components/brand/wordmark";
import { AlertCard } from "@/components/system/alert-card";
import { CellMeter, type Confidence } from "@/components/system/cell-meter";
import { Journal, type JournalEntry } from "@/components/system/journal";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const loop = [
  {
    name: "Assess",
    detail: "A diagnostic with real questions: code to read, bugs to find, scenarios to reason through.",
  },
  { name: "Plan", detail: "A short path where every item says why it is there." },
  { name: "Build", detail: "Missions instead of lessons. You make something and hand it in." },
  {
    name: "Evaluate",
    detail: "What you did well, what needs work, the concept behind it, and what to do next.",
  },
  { name: "Adapt", detail: "Your skill estimates move with the evidence, and so does your next mission." },
  { name: "Recheck", detail: "Weeks later, an unannounced question finds out whether it stuck." },
];

const tracks = [
  { name: "Software Engineering", detail: "Programming, web, databases and systems." },
  { name: "Cybersecurity", detail: "Attacks, defences and secure design." },
  { name: "Data Analysis & Analytics", detail: "SQL, analysis and communicating insight." },
  { name: "Electronics & Physical Engineering", detail: "Circuits, microcontrollers, sensors and builds." },
  { name: "UI/UX & Product", detail: "Interface design, usability and product thinking." },
  { name: "Computer Science Foundations", detail: "Algorithms, data structures, networking and systems." },
];

const exampleSkills: { name: string; value: number; confidence: Confidence }[] = [
  { name: "HTTP", value: 0.41, confidence: "low" },
  { name: "SQL", value: 0.68, confidence: "medium" },
  { name: "APIs", value: 0.62, confidence: "high" },
];

const exampleJournal: JournalEntry[] = [
  { id: "1", when: "Sat", label: "sql", delta: 0.05, text: "Knowledge check on indexes: pass" },
  { id: "2", when: "Fri", label: "sql", delta: -0.06, text: "Surprise check on isolation levels: missed" },
  { id: "3", when: "Wed", label: "sql", delta: 0.04, text: "Mission, schema for a task app: partial" },
  { id: "4", when: "Mon", label: "sql", delta: 0.12, text: "Diagnostic, JOIN scenario: strong" },
];

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="pt-safe">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
          <Wordmark className="text-xl" />
          <Button asChild variant="ghost" size="sm">
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <Hero />
        <Loop />
        <Receipts />
        <MissionsAndChecks />
        <Tracks />
        <Close />
      </main>

      <footer className="pb-safe">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-5 py-8 text-footnote text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Wordmark className="text-base text-foreground" />
          <p>An AI-managed technical apprenticeship.</p>
        </div>
      </footer>
    </div>
  );
}

function Hero() {
  return (
    <section className="mx-auto grid w-full max-w-6xl gap-12 px-5 pt-8 pb-16 sm:px-8 sm:pt-14 lg:grid-cols-12 lg:items-center lg:gap-10 lg:pt-20 lg:pb-24">
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
      </div>

      <figure
        aria-label="Example: a learner's skills, and the mentor declining to move on yet"
        className="relative lg:col-span-6 lg:pl-6"
      >
        <div className="relative mt-10 animate-rise rounded-lg border border-rule bg-window p-5 pb-12 shadow-window lg:mt-0">
          <Pip size={64} label="Pip, the mentor" className="absolute -top-14 right-20" />
          <div className="mb-4 flex items-center justify-between">
            <p className="text-headline">Skills</p>
            <Badge>Example</Badge>
          </div>
          <ul className="flex flex-col gap-4">
            {exampleSkills.map((skill) => (
              <li key={skill.name}>
                <div className="mb-1.5 flex items-baseline justify-between text-footnote">
                  <span className="font-semibold">{skill.name}</span>
                  <span className="font-mono text-muted-foreground tabular-nums">
                    {Math.round(skill.value * 100)}%
                    <span className="ml-2 font-sans">{skill.confidence} confidence</span>
                  </span>
                </div>
                <CellMeter
                  value={skill.value}
                  confidence={skill.confidence}
                  label={`${skill.name} ability`}
                  animate
                />
              </li>
            ))}
          </ul>
        </div>
        <AlertCard
          icon={<LockKeyhole aria-hidden />}
          title="Not yet."
          className="relative -mt-6 ml-5 animate-rise [animation-delay:380ms] sm:ml-12 lg:-mr-4"
          actions={
            <div aria-hidden className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <span
                className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "pointer-events-none")}
              >
                Show me why
              </span>
              <span className={cn(buttonVariants({ size: "sm" }), "pointer-events-none")}>
                Start with HTTP
              </span>
            </div>
          }
        >
          Caching builds on HTTP, and your HTTP evidence is still thin: two checks, both partial.
        </AlertCard>
      </figure>
    </section>
  );
}

function Loop() {
  return (
    <section id="how-it-works" className="scroll-mt-6 border-y border-rule bg-window">
      <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
        <h2 className="max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">
          One loop, run on your evidence.
        </h2>
        <ol className="mt-10 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
          {loop.map((step, index) => (
            <li key={step.name} className="border-t border-rule py-5">
              <p className="flex items-baseline gap-3">
                <span className="font-mono text-footnote text-muted-foreground tabular-nums">
                  {index + 1}
                </span>
                <span className="text-headline">{step.name}</span>
              </p>
              <p className="mt-1.5 pl-6 text-callout text-muted-foreground">{step.detail}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Receipts() {
  return (
    <section className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-12 lg:items-center lg:py-24">
      <div className="lg:col-span-5">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Every score has receipts.</h2>
        <p className="mt-4 max-w-md text-lg leading-relaxed text-muted-foreground">
          A percentage means nothing on its own. Each estimate keeps the answers, missions and checks that
          moved it, and says how sure it is.
        </p>
      </div>
      <div className="rounded-lg border border-rule bg-window p-5 shadow-window lg:col-span-6 lg:col-start-7">
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
        <CellMeter value={0.68} confidence="medium" label="SQL ability" className="mt-4" />
        <Journal entries={exampleJournal} className="mt-4 border-t border-rule" />
      </div>
    </section>
  );
}

function MissionsAndChecks() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 pb-16 sm:px-8 lg:pb-24">
      <div className="grid gap-4 lg:grid-cols-5">
        <article className="rounded-lg border border-rule bg-window p-6 lg:col-span-3 lg:p-8">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Missions, not lessons.</h2>
          <p className="mt-3 max-w-lg text-callout text-muted-foreground">
            Instead of chapter four, you get something to make, a reason it is next, and the criteria it will
            be judged on.
          </p>
          <div className="mt-6 rounded-md border border-rule bg-raised p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-headline">Build a tiny HTTP server</p>
              <Badge variant="signal">Today</Badge>
            </div>
            <p className="mt-2 text-footnote text-muted-foreground">
              Why now: your diagnostic showed you can call APIs but not explain what travels over the wire.
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-footnote">
              <div>
                <dt className="text-muted-foreground">Time</dt>
                <dd className="font-semibold">About 60 minutes</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Hand in</dt>
                <dd className="font-semibold">Repo link and a short write-up</dd>
              </div>
            </dl>
          </div>
        </article>
        <article className="flex flex-col justify-between gap-6 rounded-lg bg-console p-6 text-console-foreground lg:col-span-2 lg:p-8 dark:border dark:border-rule">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">It checks back.</h2>
            <p className="mt-3 text-callout text-console-foreground/70">
              Weeks after you learn something, a short unannounced question measures what you kept, not what
              you finished.
            </p>
          </div>
          <AlertCard
            icon={<Timer aria-hidden />}
            title="Quick challenge, five minutes."
            className="text-foreground"
          >
            Explain what happens between typing example.com and the page appearing.
          </AlertCard>
        </article>
      </div>
    </section>
  );
}

function Tracks() {
  return (
    <section className="border-t border-rule bg-window">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-12 lg:py-20">
        <div className="lg:col-span-4">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Six tracks, one profile.</h2>
          <p className="mt-4 text-callout text-muted-foreground">
            Pick more than one. Missions can cross them: a secure sensor that reports to an API counts toward
            electronics, backend and security at once.
          </p>
        </div>
        <ul className="grid gap-x-10 sm:grid-cols-2 lg:col-span-8">
          {tracks.map((track) => (
            <li key={track.name} className="border-t border-rule py-4">
              <p className="text-headline">{track.name}</p>
              <p className="mt-1 text-footnote text-muted-foreground">{track.detail}</p>
            </li>
          ))}
        </ul>
      </div>
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
