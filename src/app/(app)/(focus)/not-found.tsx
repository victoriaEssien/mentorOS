import { SearchX } from "lucide-react";
import Link from "next/link";

import { StatusNotice } from "@/components/system/status-notice";
import { Button } from "@/components/ui/button";

/** A full-screen flow that doesn't exist, or belongs to someone else. */
export default function FocusNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)]">
      <StatusNotice
        icon={<SearchX aria-hidden />}
        title="That page isn't here"
        actions={
          <Button asChild>
            <Link href="/today">Go to Today</Link>
          </Button>
        }
      >
        It doesn&apos;t exist, or it isn&apos;t on your account. Today has your session and your project.
      </StatusNotice>
    </main>
  );
}
