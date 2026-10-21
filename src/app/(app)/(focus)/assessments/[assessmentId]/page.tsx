import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { PageTransition } from "@/components/shell/page-transition";
import { getAssessmentForPlayer } from "@/server/queries/assessments";
import { requireLearner } from "@/server/session";

import { AssessmentPlayer } from "./player";

export const metadata: Metadata = { title: "Assessment" };

// Handing in grades every written answer with the model before redirecting to the results.
export const maxDuration = 300;

export default async function AssessmentPage({ params }: PageProps<"/assessments/[assessmentId]">) {
  const { user } = await requireLearner();
  const { assessmentId } = await params;

  const data = await getAssessmentForPlayer(user.id, assessmentId);
  if (!data || data.items.length === 0) notFound();
  if (data.completedAttempt) redirect(`/assessments/${assessmentId}/results`);

  return (
    <PageTransition>
      <AssessmentPlayer
        assessmentId={data.assessment.id}
        isDiagnostic={data.assessment.kind === "diagnostic"}
        title={data.assessment.title}
        reason={data.assessment.reason}
        items={data.items.map(({ id, type, prompt, timeLimitSeconds }) => ({
          id,
          type,
          prompt,
          timeLimitSeconds,
        }))}
        initialResponses={data.responses}
      />
    </PageTransition>
  );
}
