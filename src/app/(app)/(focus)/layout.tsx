/** Full-screen flows (onboarding): no dock, nothing to wander off to. */
export default function FocusLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-dvh w-full flex-col">{children}</div>;
}
