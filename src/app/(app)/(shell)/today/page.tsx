import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { requireLearner } from "@/server/session";

export const metadata: Metadata = { title: "Today" };

export default async function TodayPage() {
  await requireLearner();

  return (
    <PagePlaceholder
      title="Today"
      prd="PRD §26 Dashboard, §27 Progress"
      purpose="Where you are, what you're doing, and what comes next."
      todo={[
        "Current focus and current mission",
        "Skill bars with confidence (PRD §28)",
        "Recent evidence (✓ / △ / ✗)",
        "Next recommended action, including pending surprise checks",
      ]}
    />
  );
}
