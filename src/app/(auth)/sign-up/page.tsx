import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Create account" };

export default function SignUpPage() {
  return (
    <PagePlaceholder
      title="Create account"
      prd="PRD §8.1, §35 Authentication"
      purpose="Account creation via Better Auth (authClient.signUp.email). New users go straight to onboarding."
    />
  );
}
