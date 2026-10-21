// Keeps every stroke a true hairline however far the art is scaled
// (vector-effect is not inherited, so it is applied to each shape).
const HAIRLINE = "[&_*]:[vector-effect:non-scaling-stroke]";

/**
 * Branded line illustrations, kept as faint texture (the firm strip, the
 * no-photo portrait plate, the listings empty state) now that the hero, About
 * and closing band use the owner's photos. Drawn in currentColor, so callers
 * set the tint with a text-* token and opacity. Purely decorative:
 * aria-hidden, no focusable parts.
 */

// Deterministic skyline: [x, width, height] per building on a 1200 x 320 canvas.
const BUILDINGS: [number, number, number][] = [
  [0, 70, 120], [64, 54, 190], [112, 80, 150], [186, 46, 240], [226, 90, 175],
  [310, 60, 280], [364, 84, 205], [442, 52, 140], [488, 96, 250], [578, 58, 300],
  [630, 88, 185], [712, 50, 230], [756, 98, 160], [848, 62, 265], [904, 84, 195],
  [982, 54, 135], [1030, 92, 220], [1116, 84, 165],
];

const H = 320;

/** City skyline in hairline outlines with a sparse window grid. */
export function Skyline({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={`0 0 1200 ${H}`}
      preserveAspectRatio="xMidYMax slice"
      className={`${HAIRLINE} ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
    >
      {BUILDINGS.map(([x, w, h], i) => {
        const top = H - h;
        const cols = Math.max(2, Math.floor(w / 16));
        const rows = Math.floor((h - 24) / 22);
        return (
          <g key={i}>
            <rect x={x + 0.5} y={top + 0.5} width={w - 1} height={h} />
            {i % 3 === 0 && <line x1={x + w / 2} y1={top} x2={x + w / 2} y2={top - 18} />}
            {Array.from({ length: rows }, (_, r) =>
              Array.from({ length: cols }, (_, c) =>
                (r + c + i) % 3 === 0 ? null : (
                  <rect
                    key={`${r}-${c}`}
                    x={x + 6 + c * ((w - 12) / cols)}
                    y={top + 12 + r * 22}
                    width={Math.max(3, (w - 12) / cols - 6)}
                    height={10}
                    strokeWidth="0.75"
                  />
                ),
              ),
            )}
          </g>
        );
      })}
      <line x1="0" y1={H - 0.5} x2="1200" y2={H - 0.5} />
    </svg>
  );
}

/**
 * A tower facade in elevation (curtain-wall grid with a few lit panes), for
 * the listings empty state. `lit` panes take the accent class given.
 */
export function FacadeIllustration({
  className = "",
  litClassName = "",
}: {
  className?: string;
  litClassName?: string;
}) {
  const cols = 6;
  const rows = 14;
  const lit = new Set(["2-1", "4-3", "7-4", "9-2", "12-1", "5-5"]);
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 300 420"
      preserveAspectRatio="xMidYMid slice"
      className={`${HAIRLINE} ${className}`}
      fill="none"
      stroke="currentColor"
    >
      {/* Main tower */}
      <rect x="60.5" y="40.5" width="180" height="400" strokeWidth="1.25" />
      <line x1="150" y1="40" x2="150" y2="10" strokeWidth="1" />
      <rect x="120.5" y="24.5" width="60" height="16" strokeWidth="1" />
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => {
          const key = `${r}-${c}`;
          return (
            <rect
              key={key}
              x={68 + c * 28.5}
              y={52 + r * 26}
              width={22}
              height={18}
              strokeWidth="0.75"
              className={lit.has(key) ? litClassName : undefined}
              fill={lit.has(key) ? "currentColor" : "none"}
              fillOpacity={lit.has(key) ? 0.45 : undefined}
            />
          );
        }),
      )}
      {/* Neighbouring low-rise blocks for depth */}
      <rect x="0.5" y="230.5" width="54" height="200" strokeWidth="1" />
      <rect x="246.5" y="180.5" width="54" height="250" strokeWidth="1" />
      {Array.from({ length: 7 }, (_, r) => (
        <g key={r} strokeWidth="0.75">
          <line x1="8" y1={248 + r * 24} x2="46" y2={248 + r * 24} />
          <line x1="254" y1={198 + r * 30} x2="292" y2={198 + r * 30} />
        </g>
      ))}
    </svg>
  );
}
