import { useRef, useState, type PointerEvent } from 'react';
import { ControlBar, Select, Slider, Toggle } from '../shared/InlineControls';
import { Readout } from '../shared/Readout';
import { plateState } from '../../lib/electromagnetism/capacitor';
import { EPSILON_0 } from '../../lib/electromagnetism/gauss';
import { Arrow, ChargeMark } from './svgMarks';

// A parallel-plate capacitor seen edge-on. The reader sets the gap (by dragging
// the top plate or with the slider), the plate area, and the material filling
// the gap, and can disconnect the battery. Connected, V is held at the battery's
// value and the charge follows the geometry; disconnected, the charge is trapped
// and V follows instead. Every number comes from plateState.

const BATTERY_VOLTS = 12;
const D_MIN = 1; // mm
const D_MAX = 10;
const A_MIN = 50; // cm²
const A_MAX = 400;

const DIELECTRICS = [
  { value: 'vacuum', label: 'Vacuum (κ = 1)', kappa: 1, name: 'vacuum' },
  { value: 'polystyrene', label: 'Polystyrene (κ = 2.6)', kappa: 2.6, name: 'polystyrene' },
  { value: 'glass', label: 'Glass (κ = 4.7)', kappa: 4.7, name: 'glass' },
];

// Scene geometry, in viewBox units.
const CX = 290;
const CY = 180;
const PLATE_T = 12;
const GAP_MIN = 34;
const GAP_MAX = 210;
const LEN_MIN = 150;
const LEN_MAX = 400;
const WIRE_TOP = 34;
const WIRE_BOTTOM = 326;
const BATTERY_X = 585;
const SWITCH_X = 470;

// The default setup (12 V across 3 mm of vacuum) is the reference density for
// both the plate charges and the field arrows: one mark or arrow every REF_SPACING.
const REF_SPACING = 56;
const E_REF = BATTERY_VOLTS / 3e-3;
const SIGMA_REF = EPSILON_0 * E_REF;

const ink = 'var(--text-primary)';
const muted = 'var(--text-muted)';
const dielectricTint = 'var(--accent-purple)';

const gapFor = (dMm: number) => GAP_MIN + ((dMm - D_MIN) / (D_MAX - D_MIN)) * (GAP_MAX - GAP_MIN);
const lengthFor = (aCm2: number) => LEN_MIN + ((aCm2 - A_MIN) / (A_MAX - A_MIN)) * (LEN_MAX - LEN_MIN);

/** Evenly spaced positions along a span, one per `spacing`, centred in the span. */
function spread(left: number, right: number, spacing: number): number[] {
  const count = Math.max(1, Math.floor((right - left) / spacing));
  const step = (right - left) / count;
  return Array.from({ length: count }, (_, i) => left + step * (i + 0.5));
}

/** Spacing for a density relative to the reference, clamped so marks never pile up or vanish. */
const spacingFor = (ratio: number, min: number, max: number) =>
  ratio <= 0 ? Infinity : Math.min(max, Math.max(min, REF_SPACING / ratio));

function fmt(value: number, digits = 3) {
  if (!Number.isFinite(value)) return '∞';
  if (value >= 1000) return Math.round(value).toLocaleString('en-US');
  return value.toPrecision(digits);
}

export default function CapacitorPlates() {
  const [separation, setSeparation] = useState(3); // mm
  const [area, setArea] = useState(200); // cm²
  const [material, setMaterial] = useState('vacuum');
  const [connected, setConnected] = useState(true);
  const [heldCharge, setHeldCharge] = useState(0); // C, used while disconnected
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);

  const dielectric = DIELECTRICS.find((d) => d.value === material) ?? DIELECTRICS[0];
  const kappa = dielectric.kappa;
  const geometry = { area: area * 1e-4, separation: separation * 1e-3, kappa };
  const state = connected
    ? plateState({ ...geometry, mode: 'battery', voltage: BATTERY_VOLTS })
    : plateState({ ...geometry, mode: 'isolated', charge: heldCharge });

  const setBattery = (next: boolean) => {
    // Disconnecting traps whatever charge the plates hold at that moment.
    if (!next) setHeldCharge(state.Q);
    setConnected(next);
  };

  const gap = gapFor(separation);
  const length = lengthFor(area);
  const left = CX - length / 2;
  const right = CX + length / 2;
  const topFace = CY - gap / 2; // inner face of the + plate
  const bottomFace = CY + gap / 2; // inner face of the − plate

  const chargeSpacing = spacingFor(state.sigmaFree / SIGMA_REF, 14, 130);
  const boundSpacing = spacingFor(state.sigmaBound / SIGMA_REF, 11, 130);
  const fieldSpacing = spacingFor(state.E / E_REF, 14, 150);
  const chargeXs = spread(left + 4, right - 4, chargeSpacing);
  const boundXs = kappa > 1 ? spread(left + 10, right - 10, boundSpacing) : [];
  const fieldXs = state.E > 0 ? spread(left + 6, right - 6, fieldSpacing) : [];
  // With a slab in, the arrows start past its bound charge unless the gap is too thin to fit both.
  const inset = kappa > 1 && gap > 60 ? 16 : 6;

  const toSvgY = (event: PointerEvent<SVGElement>) => {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    return point.matrixTransform(matrix.inverse()).y;
  };

  const dragTo = (event: PointerEvent<SVGElement>) => {
    const y = toSvgY(event);
    if (y === null) return;
    const g = Math.min(GAP_MAX, Math.max(GAP_MIN, 2 * (CY - y)));
    const d = D_MIN + ((g - GAP_MIN) / (GAP_MAX - GAP_MIN)) * (D_MAX - D_MIN);
    setSeparation(Math.round(d * 10) / 10);
  };

  const heldLabel = (which: 'Q' | 'V') =>
    (connected ? which === 'V' : which === 'Q') ? ' · fixed' : '';

  return (
    <figure className="not-prose mx-auto my-8 max-w-3xl text-[var(--text-primary)]">
      <ControlBar>
        <Slider
          label="Gap d"
          unit="mm"
          min={D_MIN}
          max={D_MAX}
          step={0.1}
          value={separation}
          onChange={setSeparation}
          format={(v) => v.toFixed(1)}
          ariaLabel="Plate separation in millimetres"
        />
        <Slider
          label="Area A"
          unit="cm²"
          min={A_MIN}
          max={A_MAX}
          step={10}
          value={area}
          onChange={setArea}
          ariaLabel="Plate area in square centimetres"
        />
        <Select
          label="Gap filled with"
          value={material}
          onChange={setMaterial}
          options={DIELECTRICS.map(({ value, label }) => ({ value, label }))}
        />
        <Toggle label="Battery connected" checked={connected} onChange={setBattery} />
      </ControlBar>

      <svg
        ref={svgRef}
        viewBox="0 0 660 360"
        className="mx-auto mt-3 block w-full"
        role="img"
        aria-label={`Parallel-plate capacitor with a ${separation.toFixed(1)} millimetre gap, ${area} square centimetre plates, filled with ${dielectric.name}. The battery is ${connected ? 'connected, holding 12 volts' : 'disconnected, so the charge is fixed'}. Capacitance ${fmt(state.C * 1e12)} picofarads, charge ${fmt(state.Q * 1e9)} nanocoulombs, potential difference ${fmt(state.V)} volts.`}
      >
        {/* Circuit: top plate up and over through a switch to the battery, bottom plate down and back. */}
        <g stroke={ink} strokeWidth={2} fill="none" strokeLinejoin="round">
          <path d={`M ${CX} ${topFace - PLATE_T} V ${WIRE_TOP} H ${SWITCH_X - 16}`} />
          <path d={`M ${SWITCH_X + 16} ${WIRE_TOP} H ${BATTERY_X} V ${CY - 12}`} />
          <path d={`M ${CX} ${bottomFace + PLATE_T} V ${WIRE_BOTTOM} H ${BATTERY_X} V ${CY + 12}`} />
        </g>
        {/* Switch: a blade hinged at its left post, closed along the wire or lifted open. */}
        <circle cx={SWITCH_X - 16} cy={WIRE_TOP} r={3.5} fill={ink} />
        <circle cx={SWITCH_X + 16} cy={WIRE_TOP} r={3.5} fill={ink} />
        <line
          x1={SWITCH_X - 16}
          y1={WIRE_TOP}
          x2={connected ? SWITCH_X + 16 : SWITCH_X + 11}
          y2={connected ? WIRE_TOP : WIRE_TOP - 22}
          stroke={ink}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        {/* Battery: long line is the + terminal. */}
        <g opacity={connected ? 1 : 0.45}>
          <line x1={BATTERY_X - 22} y1={CY - 12} x2={BATTERY_X + 22} y2={CY - 12} stroke={ink} strokeWidth={2.5} />
          <line x1={BATTERY_X - 11} y1={CY + 12} x2={BATTERY_X + 11} y2={CY + 12} stroke={ink} strokeWidth={5} />
          <text x={BATTERY_X + 30} y={CY + 5} fill={ink} fontSize={16}>12 V</text>
        </g>

        {kappa > 1 ? (
          <g>
            <rect
              x={left}
              y={topFace + 3}
              width={length}
              height={gap - 6}
              fill={dielectricTint}
              fillOpacity={0.14}
              stroke={dielectricTint}
              strokeOpacity={0.5}
            />
            {/* Bound charge on the slab faces, opposite in sign to the plate it faces. */}
            {boundXs.map((x) => (
              <g key={`b${x}`}>
                <ChargeMark x={x} y={topFace + 10} sign={-1} weight={0.35} size={0.6} />
                <ChargeMark x={x} y={bottomFace - 10} sign={1} weight={0.35} size={0.6} />
              </g>
            ))}
            <text x={right + 10} y={CY + 5} fill={muted} fontSize={15}>κ = {kappa}</text>
          </g>
        ) : null}

        {/* The field between the plates: arrow density tracks E. */}
        {gap - 2 * inset > 10 ? (
          <g opacity={0.8}>
            {fieldXs.map((x) => (
              <Arrow key={`e${x}`} x1={x} y1={topFace + inset} x2={x} y2={bottomFace - inset} color={ink} width={1.6} />
            ))}
          </g>
        ) : null}

        {/* Plates. The top one is the drag handle for the gap. */}
        <rect x={left} y={bottomFace} width={length} height={PLATE_T} rx={2} fill="var(--grid-line)" stroke={ink} strokeWidth={1.5} />
        <rect x={left} y={topFace - PLATE_T} width={length} height={PLATE_T} rx={2} fill="var(--grid-line)" stroke={ink} strokeWidth={1.5} />
        {chargeXs.map((x) => (
          <g key={`q${x}`}>
            <ChargeMark x={x} y={topFace - PLATE_T / 2} sign={1} weight={0.6} size={0.85} />
            <ChargeMark x={x} y={bottomFace + PLATE_T / 2} sign={-1} weight={0.6} size={0.85} />
          </g>
        ))}
        <rect
          x={left - 6}
          y={topFace - PLATE_T - 12}
          width={length + 12}
          height={PLATE_T + 22}
          fill="transparent"
          style={{ cursor: 'ns-resize', touchAction: 'none' }}
          onPointerDown={(event) => {
            dragging.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (dragging.current) dragTo(event);
          }}
          onPointerUp={() => { dragging.current = false; }}
          onPointerCancel={() => { dragging.current = false; }}
        />

        {/* Gap dimension on the left. */}
        <g stroke={muted} strokeWidth={1}>
          <line x1={left - 30} y1={topFace} x2={left - 30} y2={bottomFace} />
          <line x1={left - 36} y1={topFace} x2={left - 24} y2={topFace} />
          <line x1={left - 36} y1={bottomFace} x2={left - 24} y2={bottomFace} />
        </g>
        <text x={left - 40} y={CY + 5} fill={muted} fontSize={15} textAnchor="end">d</text>
        <text x={left} y={topFace - PLATE_T - 12} fill={ink} fontSize={15}>+Q</text>
        <text x={left} y={bottomFace + PLATE_T + 22} fill={ink} fontSize={15}>−Q</text>
        <text x={CX} y={WIRE_BOTTOM + 24} fill={muted} fontSize={13} textAnchor="middle">drag the top plate to change d</text>
      </svg>

      <Readout variant="inline" className="mt-3 justify-center">
        <Readout.Value label="C" value={fmt(state.C * 1e12)} unit="pF" />
        <Readout.Value label="Q" value={fmt(state.Q * 1e9)} unit={`nC${heldLabel('Q')}`} />
        <Readout.Value label="V" value={fmt(state.V)} unit={`V${heldLabel('V')}`} />
        <Readout.Value label="U" value={fmt(state.U * 1e9)} unit="nJ" />
      </Readout>

      <figcaption className="mt-3 text-center text-sm text-[var(--text-muted)]">
        Connected, the battery holds V at 12 V and charge flows on or off the plates. Disconnected, the charge
        is trapped and V changes with the geometry instead.
      </figcaption>
    </figure>
  );
}
