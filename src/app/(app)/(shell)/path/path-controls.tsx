"use client";

import { MessageSquarePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { FormAlert } from "@/components/form/form-alert";
import { SubmitButton } from "@/components/form/submit-button";
import { CellMeter } from "@/components/system/cell-meter";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";

import { askForChangeAction, planPathAction, type PlanState } from "./actions";

const EXAMPLES = [
  "I want to focus on backend work",
  "Can we move on to system design?",
  "Less theory, more building",
];

/**
 * "Ask for a change": the learner says what they want, and the planner replans around it. It may
 * still say not yet; the sheet says so up front so a "no" doesn't feel like a bug.
 */
export function AskForChange() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [state, formAction, pending] = useActionState(async (previous: PlanState, formData: FormData) => {
    const result = await askForChangeAction(previous, formData);
    if (result.ok) {
      setOpen(false);
      setText("");
      toast.success("Path replanned");
    }
    return result;
  }, {});

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="secondary" className="w-full">
          <MessageSquarePlus aria-hidden />
          Ask for a change
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        {pending ? (
          <div className="px-5 pt-6 pb-8" role="status">
            <CellMeter
              value={1}
              label="Replanning"
              animate
              className="[&>span]:h-3 [&>span]:[animation-direction:alternate] [&>span]:[animation-iteration-count:infinite]"
            />
            <DrawerTitle className="mt-6">Replanning around your request</DrawerTitle>
            <DrawerDescription className="mt-1">
              This takes about half a minute. You can close this; the path updates when it&apos;s done.
            </DrawerDescription>
          </div>
        ) : (
          <form action={formAction} className="flex flex-col">
            <DrawerHeader>
              <DrawerTitle>Ask for a change</DrawerTitle>
              <DrawerDescription>
                Tell me what you want to focus on and I&apos;ll replan around it. If something isn&apos;t
                ready yet, I&apos;ll say what it needs first.
              </DrawerDescription>
            </DrawerHeader>
            <div className="flex flex-col gap-3 px-5 pt-1">
              <Textarea
                name="request"
                aria-label="What you want to change"
                placeholder="What do you want to change?"
                value={text}
                onChange={(event) => setText(event.target.value)}
                maxLength={500}
                className="min-h-24"
              />
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setText(example)}
                    className="pressable rounded-full border border-rule bg-raised px-3 py-1.5 text-footnote outline-none hover:border-rule-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {example}
                  </button>
                ))}
              </div>
              {state.error ? <FormAlert>{state.error}</FormAlert> : null}
            </div>
            <div className="p-5 pt-4">
              <SubmitButton className="w-full" size="lg" disabled={text.trim().length < 3}>
                Replan my path
              </SubmitButton>
            </div>
          </form>
        )}
      </DrawerContent>
    </Drawer>
  );
}

/** For a learner without a path: plan one now. */
export function PlanPathButton() {
  const [state, formAction] = useActionState(planPathAction, {});
  return (
    <form action={formAction} className="flex flex-col gap-3">
      {state.error ? <FormAlert>{state.error}</FormAlert> : null}
      <SubmitButton size="lg" pendingLabel="Planning, about half a minute">
        Plan my path
      </SubmitButton>
    </form>
  );
}

/**
 * The first path is planned in the background right after the diagnostic. While it's on its way,
 * look again every few seconds; the server decides when to stop showing this.
 */
export function PlanningPoller() {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(timer);
  }, [router]);
  return null;
}
