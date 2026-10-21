import { CircleUserRound, Flag, MessagesSquare, Route as RouteIcon, Sun } from "lucide-react";
import type { Route } from "next";

/** The five apps in the dock. `segment` is the first URL segment under the shell layout. */
export const navItems = [
  { href: "/today", segment: "today", label: "Today", icon: Sun },
  { href: "/path", segment: "path", label: "Path", icon: RouteIcon },
  { href: "/missions", segment: "missions", label: "Missions", icon: Flag },
  { href: "/mentor", segment: "mentor", label: "Mentor", icon: MessagesSquare },
  { href: "/profile", segment: "profile", label: "You", icon: CircleUserRound },
] as const satisfies readonly {
  href: Route;
  segment: string;
  label: string;
  icon: typeof Sun;
}[];

export type NavItem = (typeof navItems)[number];

/** Screens pushed from a tab keep that tab lit, the way a native tab bar does. */
const tabOfSubScreen: Record<string, NavItem["segment"]> = {
  assessments: "profile",
  settings: "profile",
};

export function activeTab(segment: string | null) {
  return segment ? (tabOfSubScreen[segment] ?? segment) : null;
}
