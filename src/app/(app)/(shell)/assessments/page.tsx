import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Assessments" };

export default function AssessmentsPage() {
  return (
    <PagePlaceholder
      title="Assessments"
      prd="PRD §9 Diagnostic, §18 Surprise assessments"
      purpose="Diagnostic, knowledge checks, surprise checks and reassessments, with results feeding skill evidence."
      todo={["Pending and completed assessments", "Never reveal rubrics before submission"]}
      back={{ href: "/profile", label: "You" }}
    />
  );
}
