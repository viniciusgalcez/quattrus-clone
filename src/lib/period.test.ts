import { describe, it, expect } from "vitest";
import {
  isValidPeriod,
  comparePeriods,
  getPeriodWriteState,
  type PeriodBlockReason,
} from "./period";

const base = {
  period: "2026-05",
  today: "2026-08",
  globallyClosed: false,
  departmentClosed: false,
  isOwnerOrAdmin: true,
};

const state = (o: Partial<typeof base> = {}) => getPeriodWriteState({ ...base, ...o });
const reasonOf = (o: Partial<typeof base> = {}): PeriodBlockReason | null => state(o).reason;

describe("isValidPeriod", () => {
  it.each(["2026-01", "2026-12", "1999-07"])("accepts %s", (p) => {
    expect(isValidPeriod(p)).toBe(true);
  });

  it.each([
    "2026-13",
    "2026-00",
    "2026-1",
    "26-01",
    "2026/01",
    "",
    "2026-01; DROP TABLE",
    "  2026-01",
  ])("rejects %s", (p) => {
    expect(isValidPeriod(p)).toBe(false);
  });
});

describe("comparePeriods", () => {
  it("orders chronologically across a year boundary", () => {
    expect(comparePeriods("2025-12", "2026-01")).toBeLessThan(0);
    expect(comparePeriods("2026-01", "2025-12")).toBeGreaterThan(0);
    expect(comparePeriods("2026-03", "2026-03")).toBe(0);
  });

  it("sorts a list chronologically as plain strings", () => {
    const sorted = ["2026-10", "2026-02", "2025-11"].sort(comparePeriods);
    expect(sorted).toEqual(["2025-11", "2026-02", "2026-10"]);
  });
});

describe("getPeriodWriteState", () => {
  it("allows a past period for the owner", () => {
    expect(state({ period: "2026-01" })).toEqual({ writable: true, reason: null });
  });

  it("allows the current period", () => {
    expect(state({ period: "2026-08" })).toEqual({ writable: true, reason: null });
  });

  it("blocks the next month as FUTURO", () => {
    expect(reasonOf({ period: "2026-09" })).toBe("FUTURO");
  });

  it("blocks a future year as FUTURO", () => {
    expect(reasonOf({ period: "2027-01" })).toBe("FUTURO");
  });

  it("blocks a malformed period as PERIODO_INVALIDO", () => {
    expect(reasonOf({ period: "2026-13" })).toBe("PERIODO_INVALIDO");
    expect(reasonOf({ period: "" })).toBe("PERIODO_INVALIDO");
  });

  it("blocks a globally closed period", () => {
    expect(reasonOf({ globallyClosed: true })).toBe("FECHADO");
  });

  it("blocks a department-closed period", () => {
    expect(reasonOf({ departmentClosed: true })).toBe("FECHADO");
  });

  it("blocks a closed period even for an owner or admin — the lock has no bypass", () => {
    expect(state({ globallyClosed: true, isOwnerOrAdmin: true })).toEqual({
      writable: false,
      reason: "FECHADO",
    });
  });

  it("blocks a non-owner as SEM_PERMISSAO", () => {
    expect(reasonOf({ isOwnerOrAdmin: false })).toBe("SEM_PERMISSAO");
  });

  describe("precedence when several rules apply at once", () => {
    it("reports PERIODO_INVALIDO ahead of everything else", () => {
      expect(
        reasonOf({
          period: "nope",
          globallyClosed: true,
          isOwnerOrAdmin: false,
        })
      ).toBe("PERIODO_INVALIDO");
    });

    it("reports FUTURO ahead of FECHADO", () => {
      expect(reasonOf({ period: "2026-12", globallyClosed: true })).toBe("FUTURO");
    });

    it("reports FECHADO ahead of SEM_PERMISSAO", () => {
      expect(reasonOf({ globallyClosed: true, isOwnerOrAdmin: false })).toBe("FECHADO");
    });
  });
});
