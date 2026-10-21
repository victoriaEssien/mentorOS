"use client";

import * as Sentry from "@sentry/nextjs";
import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

import { StatusNotice } from "./status-notice";

/**
 * What a screen shows when it fails to load. Says plainly that it's on our side and that nothing
 * was lost, offers a retry (which fetches again), and gives the reference that matches the
 * server's log line.
 */
export function ScreenError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <StatusNotice
      icon={<TriangleAlert aria-hidden />}
      title="This screen didn't load"
      actions={
        <>
          <Button asChild variant="secondary">
            <Link href="/today">Go to Today</Link>
          </Button>
          <Button onClick={() => retry()}>Try again</Button>
        </>
      }
    >
      Something went wrong on our side, not yours. Anything you saved is still saved.
      {error.digest ? (
        <span className="mt-2 block font-mono text-caption">Reference {error.digest}</span>
      ) : null}
    </StatusNotice>
  );
}
