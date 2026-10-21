import { SearchX } from "lucide-react";
import Link from "next/link";

import { Screen } from "@/components/shell/screen";
import { StatusNotice } from "@/components/system/status-notice";
import { Button } from "@/components/ui/button";

/** A mission, skill or other record that doesn't exist, or belongs to someone else. Keeps the dock. */
export default function ShellNotFound() {
  return (
    <Screen>
      <StatusNotice
        icon={<SearchX aria-hidden />}
        title="That isn't here"
        actions={
          <Button asChild>
            <Link href="/today">Go to Today</Link>
          </Button>
        }
      >
        It doesn&apos;t exist, or it isn&apos;t on your account. Links from someone else&apos;s missions or
        checks only open for them.
      </StatusNotice>
    </Screen>
  );
}
