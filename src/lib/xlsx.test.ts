import { describe, expect, it } from "vitest";
import { deflateRawSync } from "node:zlib";
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

  it("rejects a truncated ZIP entry", () => {
    const workbook = rowsToXlsx(["nome"], [["Produtividade"]]);
    expect(() => parseXlsxRows(workbook.subarray(0, 35))).toThrow(/incompleta|inválida/);
  });

  it("bounds decompression even when the ZIP header lies about expanded size", () => {
    const content = deflateRawSync(Buffer.alloc(33 * 1024 * 1024, 65));
    const name = Buffer.from("xl/worksheets/sheet1.xml");
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(8, 8);
    header.writeUInt32LE(content.length, 18);
    header.writeUInt32LE(1, 22);
    header.writeUInt16LE(name.length, 26);
    expect(() => parseXlsxRows(Buffer.concat([header, name, content]))).toThrow(/limite permitido/);
  });
});
