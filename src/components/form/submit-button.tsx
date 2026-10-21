"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Submit button that knows when its form is in flight. While pending it blocks a second submit,
 * shows a spinner and the in-progress label, and stays fully opaque so it reads as busy, not off.
 */
export function SubmitButton({
  children,
  pendingLabel,
  pending: pendingOverride,
  className,
  ...props
}: React.ComponentProps<typeof Button> & { pendingLabel?: string; pending?: boolean }) {
  const status = useFormStatus();
  const pending = pendingOverride ?? status.pending;

  return (
    <Button
      type="submit"
      disabled={pending}
      className={cn(pending && "disabled:opacity-100", className)}
      {...props}
    >
      {pending ? (
        <>
          <LoaderCircle className="animate-spin" aria-hidden />
          {pendingLabel ?? children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
