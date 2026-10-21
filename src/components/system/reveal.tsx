"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Marks its content as in view the first time a quarter of it scrolls onto the screen, so the
 * landing page's motion (data-reveal-item and friends, in globals.css) plays once, when someone can
 * see it. The content is server-rendered; this only flips an attribute.
 */
export function Reveal({
  className,
  style,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setShown(true);
        observer.disconnect();
      },
      { threshold: 0.25 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} data-reveal={shown ? "in" : "out"} className={className} style={style}>
      {children}
    </div>
  );
}
