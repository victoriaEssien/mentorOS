import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Mentor" };

export default function MentorPage() {
  return (
    <PagePlaceholder
      title="Mentor"
      prd="PRD §21, §22"
      purpose="Chat with a mentor that knows your context: hints before answers, tests claimed understanding, and challenges your decisions."
      todo={[
        "useChat from @ai-sdk/react against /api/mentor",
        "Conversation list from mentor_conversation",
        "Sparring mode for architecture ideas (behaviour 15)",
      ]}
    />
  );
}
