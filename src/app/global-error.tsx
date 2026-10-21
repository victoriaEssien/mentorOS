"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import "./globals.css";

/**
 * The last resort, when the root layout itself fails: it replaces the whole document, so it
 * brings its own styles and depends on nothing else in the app.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col items-center justify-center bg-background p-6 text-foreground">
        <main className="w-full max-w-md rounded-lg border border-rule bg-window p-5 shadow-window">
          <h1 className="text-headline">mentorOS didn&apos;t load</h1>
          <p className="mt-1.5 text-callout text-muted-foreground">
            Something went wrong on our side, not yours. Anything you saved is still saved.
          </p>
          {error.digest ? (
            <p className="mt-2 font-mono text-caption text-muted-foreground">Reference {error.digest}</p>
          ) : null}
          <button
            type="button"
            onClick={() => retry()}
            className="mt-5 h-11 w-full rounded-md bg-signal font-semibold text-signal-foreground"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
