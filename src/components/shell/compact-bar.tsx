"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Pinned top bar. While the screen's large title is on screen the bar is transparent; once the
 * title scrolls under it, the bar gains a window background, a hairline and the compact title.
 */
export function CompactBar({
  title,
  titleId,
  children,
}: {
  title: string;
  titleId: string;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = document.getElementById(titleId);
    const bar = barRef.current;
    if (!target || !bar) return;

    const observer = new IntersectionObserver(([entry]) => setCollapsed(!entry.isIntersecting), {
      rootMargin: `-${bar.offsetHeight}px 0px 0px 0px`,
      threshold: 0,
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [titleId]);

  return (
    <div
      ref={barRef}
      data-collapsed={collapsed || undefined}
      className={cn(
        "sticky top-0 z-30 pt-safe transition-[background-color,box-shadow] duration-200",
        collapsed ? "bg-window shadow-[0_1px_0_var(--border)]" : "bg-transparent",
      )}
    >
      <div className="relative flex h-12 items-center gap-2 px-4 sm:px-6 lg:px-10">
        {children}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-24 truncate text-center text-headline transition-opacity duration-200",
            collapsed ? "opacity-100" : "opacity-0",
          )}
        >
          {title}
        </span>
      </div>
    </div>
  );
}
