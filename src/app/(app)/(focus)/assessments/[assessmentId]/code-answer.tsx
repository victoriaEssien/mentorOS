"use client";

import { CircleCheck, CircleX, LoaderCircle, Play } from "lucide-react";
import dynamic from "next/dynamic";
import { useState, useTransition } from "react";

import { FormAlert } from "@/components/form/form-alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CODE_LANGUAGE_LABEL, type CodeLanguage, type TestCase } from "@/lib/code-languages";
import { cn } from "@/lib/utils";

import { runCodeAction, type RunResult } from "./actions";

// The editor is the heaviest thing on the page and only code questions need it.
const CodeEditor = dynamic(() => import("@/components/system/code-editor").then((m) => m.CodeEditor), {
  ssr: false,
  loading: () => <div aria-hidden className="h-64 animate-pulse rounded-md border border-rule bg-raised" />,
});

export type CodeValue = { code: string; explanation: string };

/**
 * A code question's answer: the examples, an editor that starts from the starter (or buggy) code,
 * a way to run it against the examples, and a few sentences on the approach. Hidden tests run only
 * when the set is handed in.
 */
export function CodeAnswer({
  assessmentId,
  itemId,
  language,
  starter,
  examples,
  value,
  onChange,
}: {
  assessmentId: string;
  itemId: string;
  language: CodeLanguage;
  starter: string;
  examples: TestCase[];
  value: CodeValue | null;
  onChange: (value: CodeValue) => void;
}) {
  const code = value?.code ?? starter;
  const explanation = value?.explanation ?? "";
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, startRunning] = useTransition();

  function run() {
    startRunning(async () => {
      try {
        setResult(await runCodeAction(assessmentId, itemId, code));
      } catch {
        setResult({ ok: false, error: "The run didn't come back. Check your connection and try again." });
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {examples.length > 0 ? (
        <section aria-labelledby={`${itemId}-examples`}>
          <h2 id={`${itemId}-examples`} className="text-footnote font-semibold text-muted-foreground">
            Examples
          </h2>
          <ol className="mt-2 grid gap-2 sm:grid-cols-2">
            {examples.map((example, index) => (
              <li key={index} className="rounded-md border border-rule bg-window px-3.5 py-3">
                <IoBlock label="Input" text={example.input} />
                <IoBlock label="Output" text={example.output} className="mt-2.5" />
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section aria-labelledby={`${itemId}-code`}>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 id={`${itemId}-code`} className="text-footnote font-semibold text-muted-foreground">
            Your {CODE_LANGUAGE_LABEL[language]}
          </h2>
          <Button variant="secondary" size="sm" onClick={run} disabled={running || !code.trim()}>
            {running ? <LoaderCircle className="animate-spin" aria-hidden /> : <Play aria-hidden />}
            {running ? "Running" : "Run examples"}
          </Button>
        </div>
        <CodeEditor
          value={code}
          language={language}
          label={`Your ${CODE_LANGUAGE_LABEL[language]} code`}
          onChange={(next) => onChange({ code: next, explanation })}
        />
        <div role="status" aria-live="polite" className="empty:hidden">
          {running ? (
            <p className="mt-3 text-footnote text-muted-foreground">
              Compiling and running in a fresh sandbox. This takes a few seconds.
            </p>
          ) : result ? (
            <RunResults result={result} />
          ) : null}
        </div>
      </section>

      <div>
        <Label htmlFor={`${itemId}-approach`}>Your approach</Label>
        <p className="mt-1 text-footnote text-muted-foreground">
          How it works, and its time and space complexity, in a few sentences.
        </p>
        <Textarea
          id={`${itemId}-approach`}
          value={explanation}
          onChange={(event) => onChange({ code, explanation: event.target.value })}
          maxLength={4000}
          className="mt-2 min-h-28"
        />
      </div>
    </div>
  );
}

function RunResults({ result }: { result: RunResult }) {
  if (!result.ok) return <FormAlert className="mt-3">{result.error}</FormAlert>;
  if (result.compileError) {
    return (
      <div className="mt-3 rounded-md border border-fail/40 bg-fail/5 px-3.5 py-3">
        <p className="text-callout font-semibold">It didn&apos;t compile</p>
        <pre className="mt-2 max-h-56 overflow-auto font-mono text-[0.75rem] leading-relaxed whitespace-pre-wrap">
          {result.compileError}
        </pre>
      </div>
    );
  }

  const passed = result.examples.filter((example) => example.passed).length;
  const all = passed === result.examples.length;
  return (
    <div className="mt-3 flex flex-col gap-2">
      <p
        className={cn("flex items-center gap-2 text-callout font-semibold", all ? "text-pass" : "text-fail")}
      >
        {all ? (
          <CircleCheck className="size-4.5" aria-hidden />
        ) : (
          <CircleX className="size-4.5" aria-hidden />
        )}
        {passed} of {result.examples.length} examples pass
        {all ? ". The hidden tests run when you hand in." : ""}
      </p>
      {result.examples.map((example, index) =>
        example.passed ? null : (
          <div key={index} className="rounded-md border border-rule bg-window px-3.5 py-3">
            <p className="text-footnote font-semibold">Example {index + 1}</p>
            <IoBlock label="Input" text={example.input} className="mt-2" />
            <IoBlock label="Expected" text={example.expected} className="mt-2" />
            {example.timedOut ? (
              <p className="mt-2 text-footnote text-fail">
                Ran out of time (2 seconds). Look for a loop that never ends.
              </p>
            ) : (
              <IoBlock label="Your output" text={example.stdout || "(nothing)"} className="mt-2" />
            )}
            {example.stderr ? <IoBlock label="Errors" text={example.stderr} className="mt-2" /> : null}
          </div>
        ),
      )}
    </div>
  );
}

function IoBlock({ label, text, className }: { label: string; text: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-caption text-muted-foreground">{label}</p>
      <pre className="mt-0.5 max-h-40 overflow-auto font-mono text-[0.8125rem] leading-relaxed whitespace-pre-wrap">
        {text.replace(/\n+$/, "") || " "}
      </pre>
    </div>
  );
}
