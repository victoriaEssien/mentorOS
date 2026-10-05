"use client";

import Link, { useLinkStatus } from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

import { cn } from "@/lib/utils";

import { navItems, type NavItem } from "./nav-items";

/**
 * Bottom dock on phones. The current app sits on a signal-yellow selection pill; a tapped app
 * lights up immediately while its screen loads, so a tap never feels ignored.
 */
export function Dock() {
  const segment = useSelectedLayoutSegment();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-window pb-safe shadow-dock lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5 px-1.5 pt-1.5 pb-1">
        {navItems.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={segment === item.segment ? "page" : undefined}
              className="flex pressable flex-col items-center gap-1 rounded-md py-1 outline-none focus-visible:outline-2 focus-visible:outline-ring"
            >
              <DockLabel item={item} current={segment === item.segment} />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function DockLabel({ item, current }: { item: NavItem; current: boolean }) {
  const { pending } = useLinkStatus();
  const active = current || pending;
  const Icon = item.icon;

  return (
    <>
      <span
        className={cn(
          "flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-150",
          active ? "bg-signal text-signal-foreground" : "text-muted-foreground",
        )}
      >
        <Icon className="size-5.5" strokeWidth={active ? 2.25 : 2} aria-hidden />
      </span>
      <span
        className={cn(
          "text-[0.6875rem] leading-none font-semibold",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {item.label}
      </span>
    </>
  );
}
