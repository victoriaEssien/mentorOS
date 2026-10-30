"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, getToolName, isToolUIPart, type UIMessage } from "ai";
import { ArrowUp, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Pip, PipSays } from "@/components/brand/pip";
import { FormAlert } from "@/components/form/form-alert";
import { Markdown } from "@/components/system/markdown";
import { Button } from "@/components/ui/button";
import { routeErrorMessage } from "@/lib/route-error";
import { cn } from "@/lib/utils";

type ToolPart = Extract<UIMessage["parts"][number], { type: `tool-${string}` }>;

/**
 * The mentor thread. Only the newest message is sent; the server holds the thread, the learner's
 * record and the tools. Tool results render as their own cards, like an explanation.
 */
export function MentorChat({
  threadId,
  initialMessages,
  suggestions,
}: {
  threadId: string;
  initialMessages: UIMessage[];
  suggestions: string[];
}) {
  const [input, setInput] = useState("");
  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: "/api/mentor",
        prepareSendMessagesRequest: ({ id, messages }) => ({
          body: { id, message: { parts: messages.at(-1)?.parts ?? [] } },
        }),
      }),
  );
  const { messages, sendMessage, status, error, stop } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
  });
  const busy = status === "submitted" || status === "streaming";
  const end = useRef<HTMLDivElement>(null);

  // Follow the reply as it streams, unless they've scrolled up to read something.
  useEffect(() => {
    const nearBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 240;
    if (nearBottom || status === "submitted") end.current?.scrollIntoView({ block: "end" });
  }, [messages, status]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    void sendMessage({ text: trimmed });
    setInput("");
  }

  return (
    <>
      {messages.length === 0 ? (
        <div className="flex flex-col gap-5">
          <PipSays>
            I&apos;m Pip. I know your theme, your project and the concepts you&apos;re shaky on. Ask me why
            something works, paste code you don&apos;t follow, or think a design through with me.
          </PipSays>
          <div className="flex flex-col gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => send(suggestion)}
                className="pressable rounded-lg border border-rule bg-window px-4 py-3 text-left text-callout outline-none hover:border-rule-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <ol className="flex flex-col gap-5" aria-live="polite">
          {messages.map((message) => (
            <li key={message.id}>
              {message.role === "user" ? (
                <UserMessage message={message} />
              ) : (
                <MentorMessage message={message} />
              )}
            </li>
          ))}
          {status === "submitted" ? (
            <li className="flex gap-2.5">
              <Pip mood="thinking" frame="body" size={28} className="mt-0.5" />
              {/* True to what happens first: the server loads their record before the model starts. */}
              <ol className="flex flex-col gap-2 pt-1">
                <Step state="running" label="Reading your record" />
              </ol>
            </li>
          ) : null}
        </ol>
      )}

      {error ? (
        <FormAlert className="mt-5">
          {routeErrorMessage(error, "That message didn't go through. Try again.")}
        </FormAlert>
      ) : null}
      <div ref={end} />

      {/* Rests on the dock over a strip of desk, so the thread scrolls under it rather than showing through a gap. */}
      <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+4rem)] z-20 -mx-4 mt-6 bg-background px-4 pt-1 pb-3 before:pointer-events-none before:absolute before:inset-x-0 before:-top-5 before:h-5 before:bg-linear-to-t before:from-background sm:-mx-6 sm:px-6 lg:bottom-0 lg:-mx-10 lg:px-10 lg:pb-4">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            send(input);
          }}
          className="flex items-end gap-2 rounded-lg border border-rule bg-window p-2 shadow-window"
        >
          <textarea
            aria-label="Message Pip"
            placeholder="Ask Pip about your work"
            value={input}
            rows={1}
            maxLength={4000}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              // Enter sends on a keyboard; Shift+Enter (and the phone's return key with a modifier) adds a line.
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                send(input);
              }
            }}
            className="field-sizing-content max-h-40 min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 text-body outline-none placeholder:text-muted-foreground"
          />
          {busy ? (
            <Button
              type="button"
              size="icon"
              variant="secondary"
              aria-label="Stop"
              onClick={() => void stop()}
            >
              <Square className="size-4 fill-current" />
            </Button>
          ) : (
            <Button type="submit" size="icon" aria-label="Send" disabled={!input.trim()}>
              <ArrowUp className="size-5" />
            </Button>
          )}
        </form>
      </div>
    </>
  );
}

function UserMessage({ message }: { message: UIMessage }) {
  const text = message.parts.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("\n");
  return (
    <p className="ml-auto w-fit max-w-[85%] rounded-lg rounded-br-xs bg-foreground px-3.5 py-2.5 text-callout whitespace-pre-wrap text-background">
      {text}
    </p>
  );
}

/**
 * A mentor reply in order: each run of tool calls is an activity log (what it did and why), then
 * the cards those tools produced, then its words.
 */
function MentorMessage({ message }: { message: UIMessage }) {
  const blocks: React.ReactNode[] = [];
  let run: ToolPart[] = [];

  const closeRun = () => {
    if (run.length === 0) return;
    const steps = run;
    blocks.push(
      <ol key={`steps-${blocks.length}`} className="flex flex-col gap-2">
        {steps.map((part) => (
          <ToolStep key={part.toolCallId} part={part} />
        ))}
      </ol>,
    );
    for (const part of steps) {
      const card = <ToolCard key={`card-${part.toolCallId}`} part={part} />;
      blocks.push(card);
    }
    run = [];
  };

  message.parts.forEach((part, index) => {
    if (isToolUIPart(part)) {
      run.push(part as ToolPart);
      return;
    }
    if (part.type === "text" && part.text.trim()) {
      closeRun();
      blocks.push(
        <div
          key={`text-${index}`}
          className="w-fit max-w-full rounded-lg rounded-tl-xs border border-rule bg-window px-3.5 py-2.5"
        >
          <Markdown text={part.text} />
        </div>,
      );
    }
  });
  closeRun();

  return (
    <div className="flex gap-2.5">
      <Pip frame="body" size={28} className="mt-0.5" />
      <div className="flex min-w-0 flex-1 flex-col gap-3">{blocks}</div>
    </div>
  );
}

type StepState = "running" | "done" | "failed";

/** One line of the activity log: a cell for its state, what it did, and why. */
function Step({ state, label, because }: { state: StepState; label: string; because?: string }) {
  return (
    <li className="flex gap-2.5 text-footnote" role={state === "running" ? "status" : undefined}>
      <span
        aria-hidden
        className={cn(
          "mt-1 size-2.5 shrink-0 rounded-xs",
          state === "running" && "animate-pulse bg-signal",
          state === "done" && "bg-foreground",
          state === "failed" && "border border-rule-strong",
        )}
      />
      <span className="min-w-0">
        <span className={cn(state === "failed" && "text-muted-foreground")}>{label}</span>
        {because ? <span className="block text-muted-foreground">because {because}</span> : null}
      </span>
    </li>
  );
}

function ToolStep({ part }: { part: ToolPart }) {
  const name = getToolName(part);
  const input = (part.input ?? {}) as Record<string, unknown>;
  const state: StepState =
    part.state === "output-error" ? "failed" : part.state === "output-available" ? "done" : "running";
  const because =
    typeof input.why === "string" && input.why.trim() ? input.why.trim().replace(/\.$/, "") : undefined;

  return <Step state={state} label={describe(name, state)} because={because} />;
}

/** What a tool is doing, did, or couldn't do, in the learner's words. */
function describe(name: string, state: StepState): string {
  if (name === "explain_concept") {
    if (state === "running") return "Writing an explanation";
    return state === "failed" ? "Couldn't write the explanation" : "Wrote an explanation";
  }
  // Steps from tools that no longer exist, in older conversations.
  return state === "running" ? "Working" : state === "failed" ? "That step didn't work" : "Done";
}

/** What a finished tool hands the learner: an explanation, as its own card. */
function ToolCard({ part }: { part: ToolPart }) {
  if (part.state !== "output-available") return null;
  const output = part.output as Record<string, unknown>;
  if (getToolName(part) === "explain_concept" && typeof output.explanation === "string") {
    return (
      <div className="rounded-lg border border-rule bg-window p-4 shadow-window">
        <Markdown text={output.explanation} />
      </div>
    );
  }
  return null;
}
