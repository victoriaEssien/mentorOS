import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <PagePlaceholder
      title="Dashboard"
      prd="PRD §26 Dashboard, §27 Progress"
      purpose="Answers three questions at a glance: where am I, what am I doing, what's next."
      todo={[
        "Current focus and current mission",
        "Skill bars with confidence (PRD §28)",
        "Recent evidence (✓ / △ / ✗)",
        "Next recommended action, including pending surprise checks",
      ]}
    />
  );
}
