import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { getLearnerProfile } from "@/server/queries/learner";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Onboarding" };

export default async function OnboardingPage() {
  const user = await requireUser();
  const profile = await getLearnerProfile(user.id);
  if (profile?.onboardingCompletedAt) redirect("/today");

  return (
    <PagePlaceholder
      title="Set up your apprenticeship"
      prd="PRD §8 Onboarding"
      purpose="Choose tracks, set goals and share background. Background supplements the diagnostic; it never sets skill levels."
      todo={[
        "Step 1: track selection (multi-select, PRD §8.2)",
        "Step 2: goals plus custom goal (PRD §8.3)",
        "Step 3: background and weekly time (PRD §8.4)",
        "On finish: loop.completeOnboarding → diagnostic assessment",
      ]}
    />
  );
}
