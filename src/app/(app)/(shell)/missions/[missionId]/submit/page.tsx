import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { requireLearner } from "@/server/session";

export default async function MissionSubmitPage({ params }: PageProps<"/missions/[missionId]/submit">) {
  await requireLearner();
  const { missionId } = await params;

  return (
    <PagePlaceholder
      title="Hand in"
      prd="PRD §15, §16, §20"
      purpose={`Hand in your work for mission ${missionId}: links, a written explanation and a short reflection.`}
      back={{ href: "/missions", label: "Missions" }}
    />
  );
}
