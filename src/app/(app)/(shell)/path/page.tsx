import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { requireLearner } from "@/server/session";

export const metadata: Metadata = { title: "Learning path" };

export default async function LearningPathPage() {
  await requireLearner();

  return (
    <PagePlaceholder
      title="Learning path"
      prd="PRD §12, §17"
      purpose="Your personalised path. Every item explains why it is there, and the path changes when evidence changes."
      todo={[
        "Current focus summary",
        "Ordered items, each with its reason",
        "Deferred requests with 'not yet' reasoning (behaviour 17)",
      ]}
    />
  );
}
