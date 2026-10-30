import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getLearnerProfile } from "@/server/queries/learner";
import { THEMES } from "@/lib/themes";
import { requireUser } from "@/server/session";

import { OnboardingWizard } from "./wizard";

export const metadata: Metadata = { title: "Get started" };

export default async function OnboardingPage() {
  const user = await requireUser();
  const profile = await getLearnerProfile(user.id);
  if (profile?.onboardingCompletedAt) redirect("/today");

  return (
    <OnboardingWizard
      themes={THEMES.slice(0, 5).map(({ title, weeks, summary }) => ({ title, weeks, summary }))}
      initial={
        profile
          ? {
              goals: profile.goals as never,
              customGoal: profile.customGoal,
              currentRole: profile.currentRole,
              yearsExperience: profile.yearsExperience,
              technologiesUsed: profile.technologiesUsed,
              previousLearning: profile.previousLearning,
              existingProjects: profile.existingProjects,
              weeklyLearningHours: profile.weeklyLearningHours,
              learningStyle: profile.learningStyle as never,
              mentorTone: profile.mentorTone,
            }
          : {}
      }
    />
  );
}
