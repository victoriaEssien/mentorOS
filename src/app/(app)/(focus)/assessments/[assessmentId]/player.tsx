"use client";

import { ChevronLeft, CircleHelp, ListChecks, X } from "lucide-react";
import Link from "next/link";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { startTransition, useActionState, useEffect, useEffectEvent, useRef, useState } from "react";

import { FormAlert } from "@/components/form/form-alert";
import { CellMeter } from "@/components/system/cell-meter";
import { CodeBlock, RichText } from "@/components/system/rich-text";
import { WorkingScreen } from "@/components/system/working-screen";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { itemTypeLabel } from "@/lib/assessment-labels";
import { isAnswered, type AssessmentResponse, type ItemPrompt } from "@/lib/assessment-response";
import { cn } from "@/lib/utils";

import { finishAssessmentAction, saveResponseAction } from "./actions";

export type PlayerItem = {
  id: string;
  type: string;
  prompt: ItemPrompt;
  timeLimitSeconds: number | null;
};

const SAVE_DELAY_MS = 700;

/**
 * One question per screen, like a quiz app. Every answer saves as it is given (typing is
 * debounced), so the learner can leave at any point and pick up where they stopped. Saves don't
 * block moving on: Next.js runs server actions one at a time per client, so they land in order
 * and always before the hand-in.
 */
export function AssessmentPlayer({
  assessmentId,
  isDiagnostic,
  title,
  reason,
  items,
  initialResponses,
}: {
  assessmentId: string;
  isDiagnostic: boolean;
  title: string;
  reason: string | null;
  items: PlayerItem[];
  initialResponses: Record<string, AssessmentResponse>;
}) {
  const [responses, setResponses] = useState(initialResponses);
  const [started, setStarted] = useState(() => Object.keys(initialResponses).length > 0);
  const [index, setIndex] = useState(() => {
    const firstOpen = items.findIndex((item) => !isAnswered(initialResponses[item.id]));
    return firstOpen === -1 ? items.length - 1 : firstOpen;
  });
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [finishState, finish, finishing] = useActionState(
    finishAssessmentAction.bind(null, assessmentId),
    {},
  );

  const pendingSave = useRef<{ itemId: string; timer: ReturnType<typeof setTimeout> } | null>(null);
  const item = items[index];
  const response = responses[item.id];
  const last = index === items.length - 1;
  const unanswered = items.filter((i) => !isAnswered(responses[i.id])).length;

  function persist(itemId: string, value: AssessmentResponse) {
    void saveResponseAction(assessmentId, itemId, value).then(
      (result) => setSaveError(result.ok ? null : result.error),
      () => setSaveError("That answer couldn't be saved. Check your connection and try again."),
    );
  }

  /** Sends a debounced save now instead of waiting for the typing pause. */
  function flush() {
    const pending = pendingSave.current;
    if (!pending) return;
    clearTimeout(pending.timer);
    pendingSave.current = null;
    const value = responses[pending.itemId];
    if (value) persist(pending.itemId, value);
  }

  function answer(value: AssessmentResponse, { debounce = false } = {}) {
    const itemId = item.id;
    setResponses((current) => ({ ...current, [itemId]: value }));
    if (pendingSave.current) clearTimeout(pendingSave.current.timer);
    pendingSave.current = null;
    if (!debounce) return persist(itemId, value);
    pendingSave.current = {
      itemId,
      timer: setTimeout(() => {
        pendingSave.current = null;
        persist(itemId, value);
      }, SAVE_DELAY_MS),
    };
  }

  function move(delta: 1 | -1) {
    flush();
    setIndex((value) => Math.min(items.length - 1, Math.max(0, value + delta)));
    window.scrollTo({ top: 0 });
  }

  function dontKnow() {
    answer({ kind: "unknown" });
    if (last) setConfirmFinish(true);
    else move(1);
  }

  /** Time's up: a blank becomes an honest "I don't know", and the assessment moves on. */
  function timeUp() {
    if (!isAnswered(response)) answer({ kind: "unknown" });
    if (last) setConfirmFinish(true);
    else move(1);
  }

  function handIn() {
    flush();
    setConfirmFinish(false);
    startTransition(() => finish());
  }

  // Switching apps on a phone is how most people "leave"; don't lose the last few keystrokes.
  const flushWhenHidden = useEffectEvent(() => {
    if (document.visibilityState === "hidden") flush();
  });
  useEffect(() => {
    const onChange = () => flushWhenHidden();
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);

  if (finishing) {
    return (
      <WorkingScreen title="Reading your answers">
        Each answer is checked against what a strong answer covers, then recorded as evidence for your skill
        profile. This takes about a minute; keep this screen open.
      </WorkingScreen>
    );
  }

  if (!started) {
    return (
      <Intro
        title={title}
        reason={reason}
        items={items}
        isDiagnostic={isDiagnostic}
        onStart={() => setStarted(true)}
      />
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 bg-background pt-safe">
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center gap-2 px-2">
          {index > 0 ? (
            <Button variant="ghost" size="icon" aria-label="Previous question" onClick={() => move(-1)}>
              <ChevronLeft className="size-6" />
            </Button>
          ) : (
            <span className="size-11 shrink-0" aria-hidden />
          )}
          <CellMeter
            value={(index + 1) / items.length}
            label={`Question ${index + 1} of ${items.length}`}
            className="flex-1 [&>span]:h-1.5"
          />
          <span className="w-12 text-right text-footnote text-muted-foreground tabular-nums">
            {index + 1}/{items.length}
          </span>
          <CloseButton onClose={flush} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-3 pb-40">
        <div
          key={item.id}
          className="animate-in duration-300 fade-in slide-in-from-right-4 motion-reduce:animate-none"
        >
          <div className="flex min-h-7 items-center justify-between gap-3">
            <Badge>{itemTypeLabel(item.type)}</Badge>
            {item.timeLimitSeconds ? <Countdown seconds={item.timeLimitSeconds} onExpire={timeUp} /> : null}
          </div>
          <h1
            className={cn(
              "mt-4 text-pretty",
              // Scenario prompts run to a paragraph; a paragraph in bold is a wall.
              item.prompt.question.length > 220
                ? "text-[1.0625rem] leading-relaxed font-medium"
                : "text-[1.1875rem] leading-snug font-semibold",
            )}
          >
            <RichText text={item.prompt.question} />
          </h1>
          {item.prompt.code ? <CodeBlock code={item.prompt.code} className="mt-4" /> : null}

          <div className="mt-6">
            {item.prompt.options ? (
              <Choices
                options={item.prompt.options}
                value={response?.kind === "choice" ? response.option : null}
                onChange={(option) => answer({ kind: "choice", option })}
              />
            ) : (
              <Textarea
                aria-label="Your answer"
                placeholder="Answer in your own words. A few sentences is plenty."
                value={response?.kind === "text" ? response.text : ""}
                onChange={(event) => answer({ kind: "text", text: event.target.value }, { debounce: true })}
                maxLength={4000}
                className="min-h-44"
              />
            )}
            {response?.kind === "unknown" ? (
              <p className="mt-3 flex items-center gap-2 text-footnote text-muted-foreground">
                <CircleHelp className="size-4 shrink-0" aria-hidden />
                Marked &ldquo;I don&apos;t know&rdquo;. Answer to replace it.
              </p>
            ) : null}
          </div>
        </div>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-window pb-safe">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-3">
          {saveError ? <FormAlert>{saveError}</FormAlert> : null}
          {finishState.error ? <FormAlert>{finishState.error}</FormAlert> : null}
          <div className="flex gap-2.5">
            <Button variant="secondary" size="lg" className="shrink-0" onClick={dontKnow}>
              I don&apos;t know
            </Button>
            {last ? (
              <Button size="lg" className="flex-1" onClick={() => setConfirmFinish(true)}>
                Finish
              </Button>
            ) : (
              <Button size="lg" className="flex-1" disabled={!isAnswered(response)} onClick={() => move(1)}>
                Next
              </Button>
            )}
          </div>
        </div>
      </footer>

      <AlertDialog open={confirmFinish} onOpenChange={setConfirmFinish}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <ListChecks aria-hidden />
            </AlertDialogMedia>
            <AlertDialogTitle>
              {isDiagnostic ? "Hand in the diagnostic?" : "Hand in your answers?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {unanswered > 0
                ? `${unanswered} ${unanswered === 1 ? "question has" : "questions have"} no answer yet and will count as “I don’t know”.`
                : "Every question has an answer. The mentor reads them next."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep going</AlertDialogCancel>
            <AlertDialogAction onClick={handIn}>Hand in</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CloseButton({ onClose }: { onClose?: () => void }) {
  return (
    <Button asChild variant="ghost" size="icon">
      <Link href="/today" onClick={onClose} aria-label="Close. Your answers are saved.">
        <X className="size-5.5" />
      </Link>
    </Button>
  );
}

/** First screen of a fresh assessment: what it is, how long, and how answers are read. */
function Intro({
  title,
  reason,
  items,
  isDiagnostic,
  onStart,
}: {
  title: string;
  reason: string | null;
  items: PlayerItem[];
  isDiagnostic: boolean;
  onStart: () => void;
}) {
  // Choice questions take about a minute; written answers about three.
  const estimate = items.reduce((sum, item) => sum + (item.prompt.options ? 1 : 3), 0);
  const minutes = Math.max(5, Math.round(estimate / 5) * 5);
  const rules = [
    "Answer in your own words. Nothing is marked on style.",
    "“I don’t know” is a real answer. An honest gap tells the mentor more than a lucky guess.",
    isDiagnostic
      ? "Questions start easy and get harder on purpose. Nobody is expected to answer all of them."
      : "Questions get harder as you go.",
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 bg-background pt-safe">
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-end px-2">
          <CloseButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-4 pb-40">
        <div className="animate-rise motion-reduce:animate-none">
          <h1 className="text-display text-balance">{title}</h1>
          {reason ? <p className="mt-3 max-w-prose text-body text-muted-foreground">{reason}</p> : null}
          <p className="mt-6 text-headline">
            {items.length} questions, about {minutes} minutes.
          </p>
          <p className="mt-1 text-callout text-muted-foreground">
            Answers save as you go, so you can stop and come back to it.
          </p>
        </div>

        <ul className="mt-8 flex flex-col divide-y divide-rule border-y border-rule">
          {rules.map((rule) => (
            <li key={rule} className="flex gap-3.5 py-4 text-callout">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-[1px] bg-foreground" />
              {rule}
            </li>
          ))}
        </ul>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-window pb-safe">
        <div className="mx-auto w-full max-w-2xl px-4 py-3">
          <Button size="lg" className="w-full" onClick={onStart}>
            Start
          </Button>
        </div>
      </footer>
    </div>
  );
}

function Choices({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: number | null;
  onChange: (option: number) => void;
}) {
  return (
    <RadioGroupPrimitive.Root
      aria-label="Options"
      value={value === null ? "" : String(value)}
      onValueChange={(next) => onChange(Number(next))}
      className="flex flex-col gap-2.5"
    >
      {options.map((option, index) => (
        <RadioGroupPrimitive.Item
          key={index}
          value={String(index)}
          className="group flex pressable items-start gap-3.5 rounded-lg border border-rule bg-window px-4 py-3.5 text-left outline-none hover:border-rule-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[state=checked]:border-foreground"
        >
          <span
            aria-hidden
            className="grid size-7 shrink-0 place-items-center rounded-sm border border-rule-strong font-mono text-footnote font-semibold group-data-[state=checked]:border-transparent group-data-[state=checked]:bg-signal group-data-[state=checked]:text-signal-foreground"
          >
            {String.fromCharCode(65 + index)}
          </span>
          <span className="min-w-0 pt-0.5 text-callout break-words">
            <RichText text={option} />
          </span>
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}

function Countdown({ seconds, onExpire }: { seconds: number; onExpire: () => void }) {
  const [left, setLeft] = useState(seconds);
  const expire = useEffectEvent(onExpire);

  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => {
      const remaining = Math.max(0, seconds - Math.floor((Date.now() - started) / 1000));
      setLeft(remaining);
      if (remaining === 0) {
        clearInterval(timer);
        expire();
      }
    }, 250);
    return () => clearInterval(timer);
  }, [seconds]);

  const minutes = Math.floor(left / 60);
  const rest = String(left % 60).padStart(2, "0");
  return (
    <span
      role="timer"
      aria-label={`${minutes} minutes ${rest} seconds left`}
      className={cn(
        "font-mono text-callout font-semibold tabular-nums",
        left <= 30 ? "text-fail" : "text-muted-foreground",
      )}
    >
      {minutes}:{rest}
    </span>
  );
}
