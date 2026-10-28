"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { Pip } from "@/components/brand/pip";
import { FormAlert } from "@/components/form/form-alert";
import { Button } from "@/components/ui/button";

import { writeStudyGuideAction } from "./actions";

/**
 * Shown while the current step has no study guide: asks for one as soon as the page opens, then
 * reloads the page's data to show it. If another tab is already writing it, waits and checks again.
 */
export function StudyGuideWriter({ pathItemId }: { pathItemId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const asked = useRef(false);

  function write() {
    setError(null);
    startTransition(async () => {
      const result = await writeStudyGuideAction(pathItemId).catch(() => ({
        ok: false as const,
        error: "Writing the guide didn't finish. Check your connection and try again.",
      }));
      if (!result.ok) return setError(result.error);
      if (!result.written) await new Promise((resolve) => setTimeout(resolve, 8_000));
      router.refresh();
    });
  }

  useEffect(() => {
    if (asked.current) return;
    asked.current = true;
    write();
    // Once per mount: the guide is written once per step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      role="status"
      className="flex items-start gap-4 rounded-lg border border-rule bg-window p-5 shadow-window"
    >
      <Pip mood={error ? "notYet" : "thinking"} size={52} />
      <div className="min-w-0 flex-1">
        {error ? (
          <>
            <FormAlert>{error}</FormAlert>
            <Button variant="secondary" className="mt-3" onClick={write}>
              Try again
            </Button>
          </>
        ) : (
          <>
            <p className="text-headline">Writing your study guide</p>
            <p className="mt-1 text-callout text-muted-foreground">
              What to learn for this step, where to read it and what to try first, pitched at your evidence.
              This takes about twenty seconds.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
