import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <PagePlaceholder
      title="Sign in"
      prd="PRD §8.1, §35 Authentication"
      purpose="Email/password and OAuth sign-in via Better Auth (authClient.signIn.email / signIn.social)."
      todo={[
        "Respect the ?next= param set by src/proxy.ts",
        "Show OAuth buttons only for configured providers",
      ]}
    />
  );
}
