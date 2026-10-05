/**
 * The mentorOS app mark: four ascending bars on a signal-yellow tile, the same glyph the app
 * uses for confidence (signal strength). Pure geometry, so icon routes need no font files.
 * Rendered by next/og (Satori), which only understands inline styles and flexbox.
 */

const INK = "#16181c";
const SIGNAL = "#ffd23f";

type AppMarkProps = {
  /** Edge length in pixels. */
  size: number;
  /** Fraction of the tile kept clear around the bars. Maskable icons need at least 0.25. */
  inset?: number;
  /** Corner radius as a fraction of the size. 0 for full-bleed (iOS and maskable). */
  corner?: number;
};

export function AppMark({ size, inset = 0.2, corner = 0.22 }: AppMarkProps) {
  const inner = size * (1 - inset * 2);
  const barWidth = inner * 0.1875;
  const gap = (inner - barWidth * 4) / 3;
  const heights = [0.4, 0.6, 0.8, 1];

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
        {heights.map((h) => (
          <div
            key={h}
            style={{
              width: barWidth,
              height: inner * h,
              background: INK,
              borderRadius: Math.max(1, barWidth * 0.18),
            }}
          />
        ))}
      </div>
    </div>
  );
}
