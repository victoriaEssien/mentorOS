import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Onboarding" };

export default function OnboardingPage() {
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
