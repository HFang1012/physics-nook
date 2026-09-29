// Small SVG drawing primitives shared by the electromagnetism diagrams.

const ink = 'var(--text-primary)';
const negative = 'var(--accent-blue)';
const positive = 'var(--accent-red)';

/**
 * A straight arrow drawn as its own geometry rather than with a stroke marker.
 * Arrows that shrink toward nothing (a field being screened, say) would
 * otherwise keep a full-size marker head while their shaft disappears.
 */
export function Arrow({ x1, y1, x2, y2, color, width = 2 }: {
  x1: number; y1: number; x2: number; y2: number; color: string; width?: number;
}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  if (length === 0) return null;
  const ux = dx / length;
  const uy = dy / length;
  const head = Math.min(10, Math.max(2.5, length * 0.42));
  const bx = x2 - ux * head;
  const by = y2 - uy * head;
  const half = head * 0.5;
  return (
    <g>
      <line x1={x1} y1={y1} x2={bx} y2={by} stroke={color} strokeWidth={width} strokeLinecap="round" />
      <polygon
        points={`${x2},${y2} ${bx - uy * half},${by + ux * half} ${bx + uy * half},${by - ux * half}`}
        fill={color}
      />
    </g>
  );
}

/** A charge marker: an accent disc with an ink glyph, both growing with `weight` (0–1). */
export function ChargeMark({ x, y, sign, weight, size = 1 }: {
  x: number; y: number; sign: 1 | -1; weight: number; size?: number;
}) {
  const r = (3.5 + 5 * weight) * size;
  const arm = r * 0.55;
  return (
    <g opacity={0.25 + 0.75 * weight}>
      <circle cx={x} cy={y} r={r} fill={sign > 0 ? positive : negative} fillOpacity={0.75} stroke={ink} strokeWidth={1} />
      <line x1={x - arm} y1={y} x2={x + arm} y2={y} stroke={ink} strokeWidth={1.4} />
      {sign > 0 ? <line x1={x} y1={y - arm} x2={x} y2={y + arm} stroke={ink} strokeWidth={1.4} /> : null}
    </g>
  );
}
