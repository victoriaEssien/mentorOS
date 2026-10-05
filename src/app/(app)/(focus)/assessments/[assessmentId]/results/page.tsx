import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { requireLearner } from "@/server/session";

export default async function AssessmentResultsPage({
  params,
}: PageProps<"/assessments/[assessmentId]/results">) {
  await requireLearner();
  const { assessmentId } = await params;

  return (
    <PagePlaceholder
      title="Results"
      prd="PRD §9, §10"
      purpose={`What assessment ${assessmentId} showed: the initial skill profile and the evidence behind it.`}
      back={{ href: "/today", label: "Today" }}
    />
  );
}
