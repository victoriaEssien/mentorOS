import { Dock } from "./dock";
import { SideRail } from "./side-rail";
import { TimeZoneSync } from "./time-zone-sync";

/** The installed-app frame: side rail on large screens, dock on phones, screens in between. */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh w-full">
      <SideRail />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      <Dock />
      <TimeZoneSync />
    </div>
  );
}
