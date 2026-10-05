"use client";

import { Settings } from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { Suspense } from "react";

import { Wordmark } from "@/components/brand/wordmark";
import { cn } from "@/lib/utils";

import { activeTab, navItems } from "./nav-items";

/** The dock, stood up as a side rail on laptops and desktops. */
export function SideRail() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-rule bg-window px-3 py-6 lg:flex">
      <Link
        href="/today"
        className="px-3 text-xl outline-none focus-visible:outline-2 focus-visible:outline-ring"
      >
        <Wordmark />
      </Link>
      {/* The current segment is URL data; the static shell renders the rail with nothing selected. */}
      <Suspense fallback={<RailLinks segment={null} />}>
        <CurrentRailLinks />
      </Suspense>
    </aside>
  );
}

function CurrentRailLinks() {
  const segment = useSelectedLayoutSegment();
  // Settings has its own row in the rail; other sub-screens light their parent tab.
  return <RailLinks segment={segment === "settings" ? segment : activeTab(segment)} />;
}

function RailLinks({ segment }: { segment: string | null }) {
  return (
    <>
      <nav aria-label="Primary" className="mt-8">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => (
            <li key={item.href}>
              <RailLink href={item.href} current={segment === item.segment} icon={item.icon}>
                {item.label}
              </RailLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-auto">
        <RailLink href="/settings" current={segment === "settings"} icon={Settings}>
          Settings
        </RailLink>
      </div>
    </>
  );
}

function RailLink({
  href,
  current,
  icon: Icon,
  children,
}: {
  href: (typeof navItems)[number]["href"] | "/settings";
  current: boolean;
  icon: typeof Settings;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className="group block pressable rounded-md outline-none focus-visible:outline-2 focus-visible:outline-ring"
    >
      <RailRow current={current} icon={Icon}>
        {children}
      </RailRow>
    </Link>
  );
}

function RailRow({
  current,
  icon: Icon,
  children,
}: {
  current: boolean;
  icon: typeof Settings;
  children: React.ReactNode;
}) {
  const { pending } = useLinkStatus();
  const active = current || pending;

  return (
    <span
      className={cn(
        "flex h-11 items-center gap-3 rounded-md px-3 text-callout font-semibold transition-colors",
        active
          ? "bg-signal text-signal-foreground"
          : "text-muted-foreground group-hover:bg-accent group-hover:text-foreground",
      )}
    >
      <Icon className="size-5" aria-hidden />
      {children}
    </span>
  );
}
