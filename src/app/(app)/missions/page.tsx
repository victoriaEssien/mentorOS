import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Missions" };

export default function MissionsPage() {
  return (
    <PagePlaceholder
      title="Missions"
      prd="PRD §13, §14, §19"
      purpose="Daily missions and the weekly challenge."
      todo={["Today's mission card", "Weekly challenge", "History with outcomes"]}
    />
  );
}
