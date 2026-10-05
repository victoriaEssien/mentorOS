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
