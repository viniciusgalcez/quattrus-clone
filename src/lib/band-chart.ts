/**
 * Shared "Realizado vs Meta ± faixa verde" series used by farol Barras,
 * detalhe do indicador, multigráficos and any export that reuses the band chart.
 */

export type BandPoint = {
  name: string;
  meta: number | null;
  realizado: number | null;
  /** Invisible base of the stacked bar — recharts' floating-range trick. */
  faixaBase: number | null;
  faixaAltura: number | null;
};

export function emptyBandPoint(name: string): BandPoint {
  return { name, meta: null, realizado: null, faixaBase: null, faixaAltura: null };
}

function hasMeaningfulNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Goal 0 without a real actual is almost always an unset default (first launch
 * / empty form). Plotting it as Meta pins the Y-axis to zero and invents a
 * purple Meta line — the Barras modal bug. Skip meta/faixa in that case; still
 * show realizado when it exists.
 */
export function shouldPlotMeta(goal: number | null | undefined, actual: number | null | undefined): boolean {
  if (!hasMeaningfulNumber(goal)) return false;
  if (goal === 0 && !hasMeaningfulNumber(actual)) return false;
  return true;
}

export function buildBandPoint(input: {
  name: string;
  goal: number | null | undefined;
  actual: number | null | undefined;
  yellowRange: number;
  absoluteLimits?: { lower: number; upper: number } | null;
}): BandPoint {
  const { name, goal, actual, yellowRange, absoluteLimits } = input;
  const realizado = hasMeaningfulNumber(actual) ? actual : null;

  if (!shouldPlotMeta(goal, actual)) {
    return { name, meta: null, realizado, faixaBase: null, faixaAltura: null };
  }

  const meta = goal as number;

  if (absoluteLimits && Number.isFinite(absoluteLimits.lower) && Number.isFinite(absoluteLimits.upper)) {
    const lo = Math.min(absoluteLimits.lower, absoluteLimits.upper);
    const hi = Math.max(absoluteLimits.lower, absoluteLimits.upper);
    return { name, meta, realizado, faixaBase: lo, faixaAltura: hi - lo };
  }

  const tolerance = (meta * yellowRange) / 100;
  return {
    name,
    meta,
    realizado,
    faixaBase: meta - tolerance,
    faixaAltura: tolerance * 2,
  };
}
