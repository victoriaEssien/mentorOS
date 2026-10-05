import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";

import { getSession } from "@/lib/auth";
import { getLearnerProfile } from "@/server/queries/learner";

/**
 * Page-level access checks. They read the request, so call them inside a Suspense boundary
 * (every app route has a loading.tsx for this), never at the top of a layout.
 * src/proxy.ts only checks that a cookie exists; these are the real checks.
 */

/** The signed-in user. Sends anyone else to sign in. */
export const requireUser = cache(async () => {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return session.user;
});

/** The signed-in learner with a finished onboarding. Sends unfinished learners to onboarding. */
export const requireLearner = cache(async () => {
  const user = await requireUser();
  const profile = await getLearnerProfile(user.id);
  if (!profile?.onboardingCompletedAt) redirect("/onboarding");
  return { user, profile };
});

/** For sign-in and sign-up: someone already signed in goes straight to the app. */
export async function redirectIfSignedIn() {
  const session = await getSession();
  if (session) redirect("/today");
}
