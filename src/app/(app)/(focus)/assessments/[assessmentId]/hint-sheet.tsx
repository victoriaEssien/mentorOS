"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowUp, Lightbulb, LoaderCircle } from "lucide-react";
import { useState } from "react";

import { FormAlert } from "@/components/form/form-alert";
import { Markdown } from "@/components/system/markdown";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { routeErrorMessage } from "@/lib/route-error";

/**
 * Hints for one question, from the mentor in hint-only mode (PRD §22). The conversation lives only
 * here; each question the learner sends counts as a hint, which lowers how much their answer to
 * this question counts as evidence. Render it keyed by the question, so each one starts fresh.
 */
export function HintSheet({ assessmentId, itemId }: { assessmentId: string; itemId: string }) {
  const [input, setInput] = useState("");
  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: "/api/mentor/hint",
        prepareSendMessagesRequest: ({ messages }) => ({
          body: {
            assessmentId,
            itemId,
            messages: messages.flatMap((message) => {
              const parts = message.parts.flatMap((part) =>
                part.type === "text" && part.text.trim() ? [{ type: "text" as const, text: part.text }] : [],
              );
              return parts.length > 0 ? [{ role: message.role, parts }] : [];
            }),
          },
        }),
      }),
  );
  const { messages, sendMessage, status, error } = useChat({ id: `hint-${itemId}`, transport });
  const busy = status === "submitted" || status === "streaming";
  const asked = messages.filter((message) => message.role === "user").length;

  function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    void sendMessage({ text: trimmed });
    setInput("");
  }

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="ghost" size="sm" className="-mr-2">
          <Lightbulb aria-hidden />
          Hint
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Hints</DrawerTitle>
          <DrawerDescription>
            I&apos;ll help you think it through, not give you the answer. Each hint lowers how much this
            answer counts as evidence{asked > 0 ? `. ${asked} so far on this question.` : "."}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex max-h-[45dvh] flex-col gap-3 overflow-y-auto px-5 py-2" aria-live="polite">
          {messages.map((message) =>
            message.role === "user" ? (
              <p
                key={message.id}
                className="ml-auto w-fit max-w-[85%] rounded-lg rounded-br-xs bg-raised px-3 py-2 text-footnote"
              >
                {message.parts.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("")}
              </p>
            ) : (
              <Markdown
                key={message.id}
                text={message.parts.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("")}
              />
            ),
          )}
          {status === "submitted" ? (
            <p className="flex items-center gap-2 text-footnote text-muted-foreground" role="status">
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
              Reading the question
            </p>
          ) : null}
          {error ? (
            <FormAlert>{routeErrorMessage(error, "That hint didn't come through. Try again.")}</FormAlert>
          ) : null}
        </div>

        <div className="flex flex-col gap-2.5 p-5 pt-3">
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => ask(asked > 0 ? "Another hint, please." : "Give me a hint.")}
          >
            <Lightbulb aria-hidden />
            {asked > 0 ? "Another hint" : "Give me a hint"}
          </Button>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              ask(input);
            }}
            className="flex items-end gap-2 rounded-lg border border-rule bg-window p-1.5"
          >
            <textarea
              aria-label="Ask about this question"
              placeholder="Or ask something specific"
              value={input}
              rows={1}
              maxLength={2000}
              onChange={(event) => setInput(event.target.value)}
              className="field-sizing-content max-h-28 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-callout outline-none placeholder:text-muted-foreground"
            />
            <Button type="submit" size="icon-sm" aria-label="Ask" disabled={busy || !input.trim()}>
              <ArrowUp className="size-4.5" />
            </Button>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
