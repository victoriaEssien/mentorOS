import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";

/**
 * Authenticated area. src/proxy.ts does a fast cookie check; this is the real session check.
 * Tabs live under (shell), full-screen flows like onboarding and the assessment player under (focus).
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  return children;
}
