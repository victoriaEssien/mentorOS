"use client";

import { ScreenError } from "@/components/system/screen-error";

/** Onboarding or an assessment that failed to load. Answers save as they go, so retrying is safe. */
export default function FocusError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)]">
      <ScreenError error={error} retry={retry} />
    </main>
  );
}
