import { cn } from "@/lib/utils";

import { PipShapes } from "./pip";

/** Top-left corner of each solid cell, step by step (1 + 2 + 3 + 3): the fourth step's top cell is drawn hollow. */
const CELLS = [
  [4, 186],
  [62, 186],
  [62, 128],
  [120, 186],
  [120, 128],
  [120, 70],
  [178, 186],
  [178, 128],
  [178, 70],
];

/**
 * The app mark's staircase, large, with Pip standing on the third step beside the hollow cell it
 * hasn't earned yet. Scales to its container's width; the stair cells follow the text colour, so it
 * works on the desk in both themes. With `build`, it assembles on load: the cells rise one by one,
 * then Pip lands on its step (the hero-* classes in globals.css).
 */
export function PipStaircase({
  label,
  build = false,
  className,
}: {
  label: string;
  build?: boolean;
  className?: string;
}) {
  const order = (index: number) => (build ? ({ "--i": index } as React.CSSProperties) : undefined);
  return (
    <svg viewBox="0 0 240 240" role="img" aria-label={label} className={cn("text-foreground", className)}>
      {CELLS.map(([x, y], index) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width="50"
          height="50"
          rx="10"
          fill="currentColor"
          className={cn(build && "hero-build")}
          style={order(index)}
        />
      ))}
      <rect
        x="180.5"
        y="14.5"
        width="45"
        height="45"
        rx="8"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        className={cn(build && "hero-build")}
        style={order(CELLS.length)}
      />
      <g transform="translate(107.8 3.7) scale(0.62)">
        <g className={cn(build && "hero-land")}>
          <PipShapes />
        </g>
      </g>
    </svg>
  );
}
