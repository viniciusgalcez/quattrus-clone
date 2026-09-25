import { describe, expect, it } from "vitest";
import { rowsToXlsx } from "@/lib/document-export";
import { parseXlsxRows } from "@/lib/xlsx";

describe("parseXlsxRows", () => {
  it("reads the system's exported XLSX layout back into tabular rows", () => {
    const workbook = rowsToXlsx(["nome", "unidade"], [["Produtividade", "%"], ["Refugo", "un."]]);
    expect(parseXlsxRows(workbook)).toEqual([
      ["nome", "unidade"],
      ["Produtividade", "%"],
      ["Refugo", "un."],
    ]);
  });
});
