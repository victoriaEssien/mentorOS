"use client";

import { Screen } from "@/components/shell/screen";
import { ScreenError } from "@/components/system/screen-error";

/** A tab that failed to load. The dock stays, so the rest of the app is one tap away. */
export default function ShellError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <Screen>
      <ScreenError error={error} retry={retry} />
    </Screen>
  );
}
