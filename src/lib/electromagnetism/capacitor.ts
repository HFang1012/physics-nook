// Parallel-plate capacitor model for the capacitance lesson. Everything is SI:
// areas in m², separations in m, charges in C, potentials in V, energies in J.
// The plates are treated as ideal (no fringing), and a dielectric, when present,
// fills the whole gap.

import { EPSILON_0 } from './gauss.ts';

/** Parallel-plate capacitance C = κε₀A/d. */
export function parallelPlateCapacitance(area: number, separation: number, kappa = 1): number {
  if (separation <= 0) return Infinity;
  return (kappa * EPSILON_0 * area) / separation;
}

/** Equivalent capacitance in series: 1/C = Σ(1/Cᵢ). */
export function seriesCapacitance(capacitances: readonly number[]): number {
  if (capacitances.length === 0) return 0;
  const inverseSum = capacitances.reduce((sum, c) => sum + 1 / c, 0);
  return inverseSum === 0 ? Infinity : 1 / inverseSum;
}

/** Equivalent capacitance in parallel: C = ΣCᵢ. */
export function parallelCapacitance(capacitances: readonly number[]): number {
  return capacitances.reduce((sum, c) => sum + c, 0);
}

/** Energy stored in a capacitor at potential difference V: U = ½CV². */
export function storedEnergy(capacitance: number, voltage: number): number {
  return 0.5 * capacitance * voltage * voltage;
}

/** Energy per unit volume in a field E inside a medium of dielectric constant κ: u = ½κε₀E². */
export function energyDensity(field: number, kappa = 1): number {
  return 0.5 * kappa * EPSILON_0 * field * field;
}

/**
 * Bound surface charge density on a dielectric face next to a plate carrying
 * free charge density σ: σ_b = σ(1 − 1/κ), opposite in sign to the plate.
 * Returned as a magnitude with the same sign as σ.
 */
export function boundChargeDensity(sigmaFree: number, kappa: number): number {
  if (kappa <= 0) return 0;
  return sigmaFree * (1 - 1 / kappa);
}

export type PlateMode = 'battery' | 'isolated';

export interface PlateInput {
  area: number;
  separation: number;
  kappa?: number;
  /** 'battery' holds V at `voltage`; 'isolated' holds Q at `charge`. */
  mode: PlateMode;
  voltage?: number;
  charge?: number;
}

export interface PlateState {
  /** Capacitance (F). */
  C: number;
  /** Charge on the positive plate (C). */
  Q: number;
  /** Potential difference between the plates (V). */
  V: number;
  /** Field in the gap (V/m). */
  E: number;
  /** Free charge density on the positive plate (C/m²). */
  sigmaFree: number;
  /** Bound charge density on the dielectric face beside the positive plate (C/m², shown as magnitude). */
  sigmaBound: number;
  /** Stored energy (J). */
  U: number;
}

/**
 * The full state of a parallel-plate capacitor. Connected to a battery, V is
 * fixed and Q = CV follows the geometry; isolated, Q is fixed and V = Q/C does.
 */
export function plateState({ area, separation, kappa = 1, mode, voltage = 0, charge = 0 }: PlateInput): PlateState {
  const C = parallelPlateCapacitance(area, separation, kappa);
  const Q = mode === 'battery' ? C * voltage : charge;
  const V = mode === 'battery' ? voltage : Q / C;
  const sigmaFree = area > 0 ? Q / area : 0;
  return {
    C,
    Q,
    V,
    E: separation > 0 ? V / separation : 0,
    sigmaFree,
    sigmaBound: boundChargeDensity(sigmaFree, kappa),
    U: 0.5 * Q * V,
  };
}
