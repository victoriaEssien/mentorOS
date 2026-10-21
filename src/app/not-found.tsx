import { SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { StatusNotice } from "@/components/system/status-notice";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Not found" };

/** Any address the app doesn't have. Outside the app frame, so it works signed in or out. */
export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)]">
      <StatusNotice
        icon={<SearchX aria-hidden />}
        title="Nothing at this address"
        actions={
          <Button asChild>
            <Link href="/today">Go to mentorOS</Link>
          </Button>
        }
      >
        The link may be mistyped, or what it pointed to has moved.
      </StatusNotice>
    </main>
  );
}
