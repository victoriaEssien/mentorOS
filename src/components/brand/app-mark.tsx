/**
 * The mentorOS app mark: the app's 10-cell skill meter folded into a staircase (1 + 2 + 3 + 4
 * cells) on a signal-yellow tile. The top cell of the last step is hollow: the next one to earn.
 * Pure geometry, so icon routes need no font files. Rendered by next/og (Satori), which only
 * understands inline styles and flexbox.
 */

const INK = "#16181c";
const SIGNAL = "#ffd23f";

type AppMarkProps = {
  /** Edge length in pixels. */
  size: number;
  /** Fraction of the tile kept clear around the staircase. Maskable icons need at least 0.25. */
  inset?: number;
  /** Corner radius as a fraction of the size. 0 for full-bleed (iOS and maskable). */
  corner?: number;
};

/**
 * The mark at tab and bookmark sizes, where ten cells and a one-pixel outline blur into a smudge:
 * three solid steps on the same tile, drawn on a 16-unit grid so every edge lands on a whole pixel.
 */
export function SmallAppMark({ size }: { size: 16 | 32 }) {
  const unit = size / 16;
  const steps = [4, 7, 10];
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "flex-end",
        background: SIGNAL,
        borderRadius: 3.5 * unit,
        // Optically centred: the staircase rises to the right, so it sits half a unit left.
        padding: `0 0 ${3 * unit}px ${2 * unit}px`,
        gap: unit,
      }}
    >
      {steps.map((height) => (
        <div
          key={height}
          style={{ width: 3 * unit, height: height * unit, background: INK, borderRadius: unit * 0.5 }}
        />
      ))}
    </div>
  );
}

export function AppMark({ size, inset = 0.18, corner = 0.22 }: AppMarkProps) {
  const inner = size * (1 - inset * 2);
  const cell = inner / 4.66;
  const gap = cell * 0.22;
  const radius = Math.max(1, cell * 0.14);
  const stroke = Math.max(1, Math.round(cell * 0.17));

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: SIGNAL,
        borderRadius: size * corner,
      }}
    >
      <div style={{ width: inner, height: inner, display: "flex", alignItems: "flex-end", gap }}>
        {[1, 2, 3, 4].map((count) => (
          <div key={count} style={{ display: "flex", flexDirection: "column", gap, width: cell }}>
            {Array.from({ length: count }, (_, index) => {
              const next = count === 4 && index === 0;
              return (
                <div
                  key={index}
                  style={{
                    width: cell,
                    height: cell,
                    boxSizing: "border-box",
                    borderRadius: radius,
                    background: next ? "transparent" : INK,
                    border: next ? `${stroke}px solid ${INK}` : "none",
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
