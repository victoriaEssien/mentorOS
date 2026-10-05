import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Skill profile" };

export default function SkillProfilePage() {
  return (
    <PagePlaceholder
      title="You"
      prd="PRD §10, §11, §28"
      purpose="What the system believes you can do, and the evidence behind every judgement."
      todo={[
        "Track → skill → subskill tree with ability and confidence",
        "Per-skill evidence history from skill_evidence",
        "Weakness patterns (behaviour 11)",
      ]}
    />
  );
}
