import { cn } from "@/lib/utils";

/**
 * Pip, the mentor: the hollow "next" cell from the app mark, come alive. Its moods map to what the
 * app is doing, never to decoration:
 *
 * - idle: waiting for the learner (blinks like a cursor);
 * - thinking: grading, planning or writing a reply;
 * - pass: a result that met the bar (hops once);
 * - notYet: a result that didn't, looking up at the cell still to earn;
 * - alert: something unannounced, like a surprise check;
 * - asleep: the learner has been away.
 *
 * Everything on the body is ink on signal yellow in both themes. Feet and anything around Pip use
 * currentColor, so they follow the text colour into dark mode.
 */

export type PipMood = "idle" | "thinking" | "pass" | "notYet" | "alert" | "asleep";

const INK = "#16181c";
const SIGNAL = "#ffd23f";

const FEATURE = { fill: "none", stroke: INK, strokeWidth: 4.5, strokeLinecap: "round" } as const;
const BLINK = "animate-pip-blink [transform-box:fill-box] origin-center motion-reduce:animate-none";

export function Pip({
  mood = "idle",
  size = 48,
  frame = "full",
  label,
  className,
}: {
  mood?: PipMood;
  /** Rendered width and height in pixels. */
  size?: number;
  /**
   * "full" leaves room around Pip for its mood (sparks, the cell it looks up at). "body" crops to
   * the body alone, for avatars and other small spots.
   */
  frame?: "full" | "body";
  /** Accessible name. Without one, Pip is decoration and hidden from assistive tech. */
  label?: string;
  className?: string;
}) {
  const full = frame === "full";
  const hop = mood === "pass" && full;

  return (
    <svg
      viewBox={full ? "0 0 120 120" : "19 23 82 82"}
      width={size}
      height={size}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("shrink-0 overflow-visible text-foreground", className)}
    >
      <g className={cn(hop && "animate-pip-hop motion-reduce:animate-none")}>
        {full ? (
          <>
            <rect x="38" y="98" width="12" height="9" rx="4" fill="currentColor" />
            <rect x="70" y="98" width="12" height="9" rx="4" fill="currentColor" />
          </>
        ) : null}
        <rect
          x="22"
          y="26"
          width="76"
          height="76"
          rx="18"
          fill={mood === "asleep" ? "#ffe27a" : SIGNAL}
          stroke={INK}
          strokeWidth={full ? 5 : 6}
        />
        <Face mood={mood} />
      </g>
      {full ? <Around mood={mood} /> : null}
    </svg>
  );
}

function Face({ mood }: { mood: PipMood }) {
  switch (mood) {
    case "thinking":
      return (
        <>
          <rect x="46" y="44" width="10" height="15" rx="5" fill={INK} />
          <rect x="72" y="44" width="10" height="15" rx="5" fill={INK} />
          <path d="M54 81 H67" {...FEATURE} />
        </>
      );
    case "pass":
      return (
        <>
          <path d="M40 62 Q46 52 52 62" {...FEATURE} strokeWidth={5} />
          <path d="M68 62 Q74 52 80 62" {...FEATURE} strokeWidth={5} />
          <path d="M48 76 Q60 94 72 76 Z" fill={INK} />
        </>
      );
    case "notYet":
      return (
        <>
          <rect x="45" y="47" width="10" height="16" rx="5" fill={INK} />
          <rect x="72" y="47" width="10" height="16" rx="5" fill={INK} />
          <path d="M53 81 Q60 78 67 81" {...FEATURE} />
        </>
      );
    case "alert":
      return (
        <>
          <circle cx="46" cy="60" r="8" fill={INK} />
          <circle cx="74" cy="60" r="8" fill={INK} />
          <circle cx="48.5" cy="57" r="2.5" fill="#fff" />
          <circle cx="76.5" cy="57" r="2.5" fill="#fff" />
          <circle cx="60" cy="83" r="4.5" fill={INK} />
        </>
      );
    case "asleep":
      return (
        <>
          <path d="M41 61 Q46 66 51 61" {...FEATURE} />
          <path d="M69 61 Q74 66 79 61" {...FEATURE} />
          <path d="M56 82 H64" {...FEATURE} />
        </>
      );
    case "idle":
      return (
        <>
          <g className={BLINK}>
            <rect x="41" y="50" width="10" height="17" rx="5" fill={INK} />
            <rect x="69" y="50" width="10" height="17" rx="5" fill={INK} />
            <rect x="43.5" y="53" width="3" height="5" rx="1.5" fill="#fff" />
            <rect x="71.5" y="53" width="3" height="5" rx="1.5" fill="#fff" />
          </g>
          <path d="M51 80 Q60 87 69 80" {...FEATURE} />
        </>
      );
  }
}

/** What surrounds Pip in each mood. Drawn in currentColor, outside the body. */
function Around({ mood }: { mood: PipMood }) {
  switch (mood) {
    case "thinking":
      return (
        <>
          {[40, 55, 70].map((x, index) => (
            <rect
              key={x}
              x={x}
              y="6"
              width="10"
              height="10"
              rx="2.5"
              fill="currentColor"
              className="animate-pip-think motion-reduce:animate-none"
              style={{ animationDelay: `${index * 0.2}s` }}
            />
          ))}
        </>
      );
    case "pass":
      return (
        <>
          <rect
            x="5"
            y="22"
            width="11"
            height="11"
            rx="2.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
          <rect x="104" y="10" width="10" height="10" rx="2.5" fill="currentColor" />
          <rect x="106" y="40" width="6" height="6" rx="1.5" fill="currentColor" />
        </>
      );
    case "notYet":
      // The cell still to earn: hollow, like the top step of the app mark.
      return (
        <rect
          x="99"
          y="3"
          width="17"
          height="17"
          rx="4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
        />
      );
    case "alert":
      return (
        <>
          <rect x="98" y="0" width="18" height="22" rx="5" fill={SIGNAL} stroke={INK} strokeWidth="2.5" />
          <rect x="105" y="4" width="4" height="9" rx="2" fill={INK} />
          <rect x="105" y="15" width="4" height="4" rx="2" fill={INK} />
        </>
      );
    case "asleep":
      return (
        <>
          <path
            d="M90 9 H100 L90 19 H100"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M105 1 H112 L105 8 H112"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      );
    case "idle":
      return null;
  }
}

/**
 * Pip saying something: Pip beside one speech bubble. Use it where the mentor explains itself
 * (why a mission was chosen, what a result means), at most once per screen.
 */
export function PipSays({
  mood = "idle",
  size = 52,
  tone = "signal",
  className,
  children,
}: {
  mood?: PipMood;
  size?: number;
  /** Signal on plain backgrounds; window inside a card that is already signal-tinted or busy. */
  tone?: "signal" | "window";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex items-end gap-2.5", className)}>
      <Pip mood={mood} size={size} />
      <div
        className={cn(
          "min-w-0 flex-1 rounded-[14px] rounded-bl-xs px-3.5 py-2.5 text-callout",
          tone === "signal" ? "bg-signal-soft text-foreground" : "border border-rule bg-window",
        )}
      >
        {children}
      </div>
    </div>
  );
}
