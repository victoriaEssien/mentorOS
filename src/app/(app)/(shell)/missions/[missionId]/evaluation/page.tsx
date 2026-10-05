import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { requireLearner } from "@/server/session";

export default async function MissionEvaluationPage({
  params,
}: PageProps<"/missions/[missionId]/evaluation">) {
  await requireLearner();
  const { missionId } = await params;

  return (
    <PagePlaceholder
      title="Evaluation"
      prd="PRD §15, §16, §20"
      purpose={`How mission ${missionId} was evaluated: scores per criterion, what went well, what needs work, why, and what's next.`}
      back={{ href: "/missions", label: "Missions" }}
    />
  );
}
