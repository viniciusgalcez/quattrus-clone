import { describe, expect, it } from "vitest";
import { buildBandPoint, emptyBandPoint, shouldPlotMeta } from "./band-chart";

describe("shouldPlotMeta", () => {
  it("skips goal 0 without actual (Barras modal bug)", () => {
    expect(shouldPlotMeta(0, null)).toBe(false);
    expect(shouldPlotMeta(0, undefined)).toBe(false);
  });

  it("plots goal 0 when there is a meaningful actual", () => {
    expect(shouldPlotMeta(0, 12)).toBe(true);
  });

  it("plots non-zero goals even without actual", () => {
    expect(shouldPlotMeta(100, null)).toBe(true);
  });

  it("skips null/undefined goals", () => {
    expect(shouldPlotMeta(null, 10)).toBe(false);
    expect(shouldPlotMeta(undefined, null)).toBe(false);
  });
});

describe("buildBandPoint", () => {
  it("returns empty meta/faixa for goal 0 without actual", () => {
    expect(buildBandPoint({ name: "Jan", goal: 0, actual: null, yellowRange: 10 })).toEqual({
      name: "Jan",
      meta: null,
      realizado: null,
      faixaBase: null,
      faixaAltura: null,
    });
  });

  it("keeps realizado when goal 0 is skipped but actual exists", () => {
    expect(buildBandPoint({ name: "Fev", goal: 0, actual: 5, yellowRange: 10 })).toEqual({
      name: "Fev",
      meta: 0,
      realizado: 5,
      faixaBase: 0,
      faixaAltura: 0,
    });
  });

  it("builds percent band around a real goal", () => {
    expect(buildBandPoint({ name: "Mar", goal: 100, actual: 95, yellowRange: 10 })).toEqual({
      name: "Mar",
      meta: 100,
      realizado: 95,
      faixaBase: 90,
      faixaAltura: 20,
    });
  });

  it("uses absolute limits when provided", () => {
    expect(
      buildBandPoint({
        name: "Abr",
        goal: 50,
        actual: 48,
        yellowRange: 10,
        absoluteLimits: { lower: 40, upper: 60 },
      })
    ).toEqual({
      name: "Abr",
      meta: 50,
      realizado: 48,
      faixaBase: 40,
      faixaAltura: 20,
    });
  });

  it("emptyBandPoint is fully null", () => {
    expect(emptyBandPoint("Mai")).toEqual({
      name: "Mai",
      meta: null,
      realizado: null,
      faixaBase: null,
      faixaAltura: null,
    });
  });
});
