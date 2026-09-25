import { inflateRawSync } from "node:zlib";

function unescapeXml(value: string) {
  return value.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

function columnIndex(reference: string) {
  let index = 0;
  for (const char of reference.replace(/\d/g, "")) index = index * 26 + char.charCodeAt(0) - 64;
  return index - 1;
}

/** Small XLSX reader for a single worksheet with textual/number values. */
export function parseXlsxRows(input: Uint8Array): string[][] {
  const files = new Map<string, string>();
  let offset = 0;
  const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
  while (offset + 30 <= input.length && view.getUint32(offset, true) === 0x04034b50) {
    const method = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const name = new TextDecoder().decode(input.slice(nameStart, nameStart + nameLength));
    const compressed = input.slice(dataStart, dataStart + compressedSize);
    const bytes = method === 0 ? compressed : method === 8 ? inflateRawSync(compressed) : null;
    if (!bytes) throw new Error("A planilha usa um tipo de compactação não suportado.");
    files.set(name, new TextDecoder().decode(bytes));
    offset = dataStart + compressedSize;
  }
  const sheet = files.get("xl/worksheets/sheet1.xml");
  if (!sheet) throw new Error("A planilha precisa conter a primeira aba de dados.");
  const shared = [...(files.get("xl/sharedStrings.xml") ?? "").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((match) => unescapeXml([...match[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((part) => part[1]).join("")));
  const rows: string[][] = [];
  for (const rowMatch of sheet.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const row: string[] = [];
    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cellMatch[1]; const content = cellMatch[2];
      const reference = /\br="([A-Z]+\d+)"/.exec(attrs)?.[1];
      if (!reference) continue;
      const index = columnIndex(reference);
      const type = /\bt="([^"]+)"/.exec(attrs)?.[1];
      const inline = /<t[^>]*>([\s\S]*?)<\/t>/.exec(content)?.[1];
      const value = /<v>([\s\S]*?)<\/v>/.exec(content)?.[1] ?? "";
      row[index] = type === "s" ? (shared[Number(value)] ?? "") : unescapeXml(inline ?? value);
    }
    if (row.some((value) => value !== undefined && value !== "")) rows.push(row.map((value) => value ?? ""));
  }
  return rows;
}
