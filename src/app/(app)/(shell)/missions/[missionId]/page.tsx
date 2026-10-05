import { PagePlaceholder } from "@/components/layout/page-placeholder";

export default async function MissionPage({ params }: PageProps<"/missions/[missionId]">) {
  const { missionId } = await params;

  return (
    <PagePlaceholder
      title="Mission"
      prd="PRD §13, §15, §16, §20"
      purpose={`Mission ${missionId}: objective, why now, instructions, resources, deliverable and evaluation criteria.`}
      back={{ href: "/missions", label: "Missions" }}
      todo={[
        "Submission form: text, links, repo URL, screenshots",
        "Reflection questions after major missions",
        "Evaluation view: scores per criterion, strengths, problems, why, next",
      ]}
    />
  );
}
