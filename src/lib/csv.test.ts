import { describe, it, expect } from "vitest";
import { parseCsv, toCsv, rowsToRecords } from "./csv";

describe("parseCsv", () => {
  it("splits plain comma-separated rows", () => {
    expect(parseCsv("a,b,c\n1,2,3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("handles quoted fields containing commas", () => {
    expect(parseCsv('a,"b,c",d')).toEqual([["a", "b,c", "d"]]);
  });

  it("unescapes doubled quotes inside a quoted field", () => {
    expect(parseCsv('"say ""hi""",ok')).toEqual([['say "hi"', "ok"]]);
  });

  it("handles CRLF line endings", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("strips a leading UTF-8 BOM", () => {
    expect(parseCsv(`${String.fromCharCode(0xfeff)}a,b\n1,2`)).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("drops blank lines instead of emitting phantom empty rows", () => {
    expect(parseCsv("a,b\n\n1,2\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("returns an empty array for empty input", () => {
    expect(parseCsv("")).toEqual([]);
  });
});

describe("toCsv", () => {
  it("joins fields with commas and rows with CRLF", () => {
    expect(toCsv([["a", "b"], [1, 2]])).toBe("a,b\r\n1,2");
  });

  it("quotes a field containing a comma", () => {
    expect(toCsv([["x,y", "z"]])).toBe('"x,y",z');
  });

  it("escapes quotes by doubling them", () => {
    expect(toCsv([['say "hi"']])).toBe('"say ""hi"""');
  });

  it("renders null/undefined as an empty field", () => {
    expect(toCsv([[null, undefined, "x"]])).toBe(",,x");
  });

  it("round-trips through parseCsv", () => {
    const original = [
      ["id", "nome"],
      ["1", "Item, com vírgula"],
      ["2", 'Item com "aspas"'],
    ];
    expect(parseCsv(toCsv(original))).toEqual(original.map((r) => r.map(String)));
  });
});

describe("rowsToRecords", () => {
  it("keys each data row by the header row", () => {
    const rows = parseCsv("id,nome\n1,Alpha\n2,Beta");
    expect(rowsToRecords(rows)).toEqual([
      { id: "1", nome: "Alpha" },
      { id: "2", nome: "Beta" },
    ]);
  });

  it("returns an empty array when there is no header", () => {
    expect(rowsToRecords([])).toEqual([]);
  });

  it("trims header whitespace and pads missing trailing fields", () => {
    const rows = [[" id ", "nome"], ["1"]];
    expect(rowsToRecords(rows)).toEqual([{ id: "1", nome: "" }]);
  });
});
