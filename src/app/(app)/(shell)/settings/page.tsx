import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <PagePlaceholder
      title="Settings"
      prd="PRD §8.4"
      purpose="Account, tracks, goals and weekly learning time."
      back={{ href: "/profile", label: "You" }}
    />
  );
}
