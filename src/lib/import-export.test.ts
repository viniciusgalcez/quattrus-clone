import { describe, it, expect } from "vitest";
import { parseCsv } from "./csv";
import {
  parseKpiImportRows,
  parseMeasurementImportRows,
  kpisToCsv,
  measurementsToCsv,
} from "./import-export";

describe("parseKpiImportRows", () => {
  const header = "id,nome,descricao,dono,departamento,item_pai_id,unidade,direcao,tipo_calculo,peso,faixa_amarela,faixa_vermelha,prioridade";

  it("parses a well-formed row", () => {
    const csv = `${header}\nkpi-1,Despesa,Uma nota,jsantos,Financeiro,,R$,MORE,SUM,10,5,15,0`;
    const [result] = parseKpiImportRows(parseCsv(csv));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toMatchObject({
        id: "kpi-1",
        nome: "Despesa",
        direcao: "MORE",
        tipo_calculo: "SUM",
        peso: 10,
        faixa_amarela: 5,
        faixa_vermelha: 15,
        prioridade: 0,
      });
    }
  });

  it("normalizes direction and calculation type case", () => {
    const csv = `${header}\n,Despesa,,,,,R$,more,manual,,,,`;
    const [result] = parseKpiImportRows(parseCsv(csv));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.direcao).toBe("MORE");
      expect(result.data.tipo_calculo).toBe("MANUAL");
    }
  });

  it("defaults tipo_calculo to MANUAL and optional numbers to null when blank", () => {
    const csv = `${header}\n,Despesa,,,,,R$,LESS,,,,,`;
    const [result] = parseKpiImportRows(parseCsv(csv));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.tipo_calculo).toBe("MANUAL");
      expect(result.data.peso).toBeNull();
    }
  });

  it("rejects a missing name, reporting the spreadsheet line number", () => {
    const csv = `${header}\n,,,,,,R$,MORE,MANUAL,,,,`;
    const [result] = parseKpiImportRows(parseCsv(csv));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.line).toBe(2);
      expect(result.error).toMatch(/nome/i);
    }
  });

  it("rejects an invalid direction", () => {
    const csv = `${header}\n,Despesa,,,,,R$,SIDEWAYS,MANUAL,,,,`;
    const [result] = parseKpiImportRows(parseCsv(csv));
    expect(result.ok).toBe(false);
  });

  it("keeps validating later rows after an earlier one fails", () => {
    const csv = `${header}\n,,,,,,R$,MORE,MANUAL,,,,\n,Despesa OK,,,,,R$,MORE,MANUAL,,,,`;
    const results = parseKpiImportRows(parseCsv(csv));
    expect(results).toHaveLength(2);
    expect(results[0].ok).toBe(false);
    expect(results[1].ok).toBe(true);
  });
});

describe("parseMeasurementImportRows", () => {
  const header = "item_id,periodo,meta,realizado,justificativa";

  it("parses a well-formed row", () => {
    const csv = `${header}\nkpi-1,2026-08,100,90,Atraso na apuração`;
    const [result] = parseMeasurementImportRows(parseCsv(csv));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toMatchObject({
        item_id: "kpi-1",
        periodo: "2026-08",
        meta: 100,
        realizado: 90,
        justificativa: "Atraso na apuração",
      });
    }
  });

  it("treats a blank realizado as null rather than a parse error", () => {
    const csv = `${header}\nkpi-1,2026-08,100,,`;
    const [result] = parseMeasurementImportRows(parseCsv(csv));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.realizado).toBeNull();
  });

  it("rejects a malformed period", () => {
    const csv = `${header}\nkpi-1,2026-13,100,,`;
    const [result] = parseMeasurementImportRows(parseCsv(csv));
    expect(result.ok).toBe(false);
  });

  it("rejects a missing item_id", () => {
    const csv = `${header}\n,2026-08,100,,`;
    const [result] = parseMeasurementImportRows(parseCsv(csv));
    expect(result.ok).toBe(false);
  });

  it("rejects a non-numeric goal", () => {
    const csv = `${header}\nkpi-1,2026-08,abc,,`;
    const [result] = parseMeasurementImportRows(parseCsv(csv));
    expect(result.ok).toBe(false);
  });
});

describe("kpisToCsv / measurementsToCsv round-trip with the import parsers", () => {
  it("exports a Kpi row that the import parser accepts back", () => {
    const csv = kpisToCsv([
      {
        id: "kpi-1",
        name: "Despesa",
        description: null,
        ownerUsername: "jsantos",
        departmentName: null,
        parentId: null,
        metricUnit: "R$",
        direction: "MORE",
        calculationType: "MANUAL",
        weight: 0,
        yellowRange: 5,
        redRange: 15,
        priority: 0,
      },
    ]);
    const [result] = parseKpiImportRows(parseCsv(csv));
    expect(result.ok).toBe(true);
  });

  it("exports a measurement row that the import parser accepts back", () => {
    const csv = measurementsToCsv([
      { kpiId: "kpi-1", period: "2026-08", goal: 100, actual: 90, justification: null },
    ]);
    const [result] = parseMeasurementImportRows(parseCsv(csv));
    expect(result.ok).toBe(true);
  });
});
