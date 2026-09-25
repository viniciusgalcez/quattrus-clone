export type FormulaKind = "MANUAL" | "SUM" | "AVERAGE" | "WEIGHTED" | "QUOTIENT" | "TOTALIZER";

export type FormulaInput = {
  value: number | null | undefined;
  weight?: number | null;
};

export type FormulaResult = {
  value: number | null;
  reason?: "NO_DATA" | "ZERO_DENOMINATOR" | "INVALID_FORMULA";
};

function validInputs(inputs: FormulaInput[]) {
  return inputs.filter((input) => typeof input.value === "number" && Number.isFinite(input.value));
}

/**
 * Single calculation contract shared by dashboard, annual grid and exports.
 * Missing values are ignored for aggregations; a completely empty input is
 * explicit so callers can render "Sem dado" instead of inventing zero.
 */
export function calculateFormula(
  kind: FormulaKind,
  inputs: FormulaInput[],
  options: { numerator?: number | null; denominator?: number | null } = {}
): FormulaResult {
  if (kind === "MANUAL") {
    const value = inputs[0]?.value;
    return typeof value === "number" && Number.isFinite(value)
      ? { value }
      : { value: null, reason: "NO_DATA" };
  }

  if (kind === "QUOTIENT") {
    const { numerator, denominator } = options;
    if (typeof numerator !== "number" || typeof denominator !== "number") {
      return { value: null, reason: "NO_DATA" };
    }
    if (denominator === 0) return { value: null, reason: "ZERO_DENOMINATOR" };
    return { value: numerator / denominator };
  }

  const values = validInputs(inputs);
  if (values.length === 0) return { value: null, reason: "NO_DATA" };

  if (kind === "SUM" || kind === "TOTALIZER") {
    return { value: values.reduce((total, input) => total + input.value!, 0) };
  }

  if (kind === "AVERAGE") {
    return { value: values.reduce((total, input) => total + input.value!, 0) / values.length };
  }

  if (kind === "WEIGHTED") {
    const weighted = values.reduce(
      (result, input) => {
        const weight = typeof input.weight === "number" && Number.isFinite(input.weight) ? input.weight : 1;
        return { total: result.total + input.value! * weight, weight: result.weight + weight };
      },
      { total: 0, weight: 0 }
    );
    if (weighted.weight === 0) return { value: null, reason: "INVALID_FORMULA" };
    return { value: weighted.total / weighted.weight };
  }

  return { value: null, reason: "INVALID_FORMULA" };
}

export function roundFormulaValue(value: number | null, decimalPlaces = 2) {
  if (value === null || !Number.isFinite(value)) return null;
  const factor = 10 ** Math.max(0, Math.min(8, decimalPlaces));
  return Math.round(value * factor) / factor;
}
