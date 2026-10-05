import { redirect } from "next/navigation";

import { AppNav } from "@/components/layout/app-nav";
import { getSession } from "@/lib/auth";

/**
 * Authenticated shell. src/proxy.ts does a fast cookie check; this is the real session check.
 * TODO: redirect to /onboarding when learner_profile.onboardingCompletedAt is null.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  return (
    <>
      <AppNav />
      <main className="flex flex-1 flex-col">{children}</main>
    </>
  );
}
