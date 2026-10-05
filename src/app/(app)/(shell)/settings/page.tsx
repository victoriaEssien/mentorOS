import type { Metadata } from "next";

import { signOutAction } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/form/submit-button";
import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { requireLearner } from "@/server/session";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireLearner();

  return (
    <PagePlaceholder
      title="Settings"
      prd="PRD §8.4"
      purpose="Account, tracks, goals and weekly learning time."
      back={{ href: "/profile", label: "You" }}
    >
      <form action={signOutAction} className="mt-6">
        <SubmitButton variant="secondary" pendingLabel="Signing out" className="w-full sm:w-auto">
          Sign out
        </SubmitButton>
      </form>
    </PagePlaceholder>
  );
}
