import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { requireLearner } from "@/server/session";

export default async function AssessmentPage({ params }: PageProps<"/assessments/[assessmentId]">) {
  await requireLearner();
  const { assessmentId } = await params;

  return (
    <PagePlaceholder
      title="Assessment"
      prd="PRD §9 Assessment types"
      purpose={`Take assessment ${assessmentId}. Renders each item type (knowledge, conceptual, code, debugging, scenario, problem-solving, practical, security, data, electronics).`}
      todo={[
        "One item at a time, optional time limits",
        "Mentor available for hints only (hintsUsed is recorded)",
        "On submit: loop.submitAssessmentAttempt",
      ]}
    />
  );
}
