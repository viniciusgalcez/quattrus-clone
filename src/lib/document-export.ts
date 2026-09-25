import { deflateSync } from "node:zlib";

function crc32(data: Uint8Array) { let crc = 0xffffffff; for (const byte of data) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); } return (crc ^ 0xffffffff) >>> 0; }
function u16(value: number) { return [value & 255, (value >>> 8) & 255]; }
function u32(value: number) { return [value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255]; }
function concat(parts: Uint8Array[]) { const total = parts.reduce((sum, part) => sum + part.length, 0); const output = new Uint8Array(total); let offset = 0; for (const part of parts) { output.set(part, offset); offset += part.length; } return output; }
function zip(files: Record<string, string>) {
  const encoder = new TextEncoder(); const locals: Uint8Array[] = []; const centrals: Uint8Array[] = []; let offset = 0;
  for (const [name, content] of Object.entries(files)) { const filename = encoder.encode(name); const data = encoder.encode(content); const crc = crc32(data); const local = new Uint8Array([...u32(0x04034b50), ...u16(20), ...u16(0x800), ...u16(0), ...u16(0), ...u16(0), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(filename.length), ...u16(0), ...filename, ...data]); locals.push(local); centrals.push(new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x800), ...u16(0), ...u16(0), ...u16(0), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(filename.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset), ...filename])); offset += local.length; }
  const central = concat(centrals); const end = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(centrals.length), ...u16(centrals.length), ...u32(central.length), ...u32(offset), ...u16(0)]); return concat([...locals, central, end]);
}
function xml(value: unknown) { return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
export function rowsToXlsx(headers: string[], rows: unknown[][]) {
  const all = [headers, ...rows]; const sheet = `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${all.map((row, r) => `<row r="${r + 1}">${row.map((value, c) => `<c r="${String.fromCharCode(65 + c)}${r + 1}" t="inlineStr"><is><t>${xml(value)}</t></is></c>`).join("")}</row>`).join("")}</sheetData></worksheet>`;
  const files = { "[Content_Types].xml": `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`, "_rels/.rels": `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`, "xl/workbook.xml": `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Dados" sheetId="1" r:id="rId1"/></sheets></workbook>`, "xl/_rels/workbook.xml.rels": `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`, "xl/worksheets/sheet1.xml": sheet };
  return zip(files);
}
export function rowsToPdf(title: string, headers: string[], rows: unknown[][]) { return rowsToPdfWithChart(title, headers, rows); }

export type ChartSeries = { goal: number; actual: number | null; color: [number, number, number] };

/**
 * Renders a minimal grouped bar chart (meta = gray, realizado = status
 * color) directly into a raw RGB pixel buffer — no canvas/SVG/rasterizer
 * dependency, since this only needs simple filled rectangles.
 */
export function renderBarChartRgb(width: number, height: number, series: ChartSeries[]): Uint8Array {
  const buf = new Uint8Array(width * height * 3).fill(255);
  if (series.length === 0) return buf;
  const margin = 4;
  const plotWidth = width - margin * 2;
  const plotHeight = height - margin * 2;
  const maxValue = Math.max(1, ...series.map((s) => Math.max(s.goal, s.actual ?? 0)));
  const groupHeight = plotHeight / series.length;
  const barHeight = Math.max(1, Math.floor(groupHeight * 0.35));
  const fillRect = (x0: number, y0: number, w: number, h: number, rgb: [number, number, number]) => {
    for (let y = Math.max(0, y0); y < Math.min(height, y0 + h); y++) {
      for (let x = Math.max(0, x0); x < Math.min(width, x0 + w); x++) {
        const idx = (y * width + x) * 3;
        buf[idx] = rgb[0]; buf[idx + 1] = rgb[1]; buf[idx + 2] = rgb[2];
      }
    }
  };
  series.forEach((s, i) => {
    const groupTop = margin + i * groupHeight;
    const goalWidth = Math.round((s.goal / maxValue) * plotWidth);
    fillRect(margin, Math.round(groupTop + 2), goalWidth, barHeight, [176, 182, 191]);
    if (s.actual !== null) {
      const actualWidth = Math.round((Math.max(s.actual, 0) / maxValue) * plotWidth);
      fillRect(margin, Math.round(groupTop + 4 + barHeight), actualWidth, barHeight, s.color);
    }
  });
  return buf;
}

/**
 * Same single-page text report as `rowsToPdf`, optionally preceded by a
 * raster chart embedded as a PDF `/XObject` image (raw RGB samples,
 * FlateDecode — no JPEG/PNG codec needed since the PDF format accepts
 * uncompressed samples directly).
 */
export function rowsToPdfWithChart(
  title: string,
  headers: string[],
  rows: unknown[][],
  chart?: { width: number; height: number; rgb: Uint8Array }
) {
  const chartPtWidth = 500;
  const chartPtHeight = 130;
  const textTop = chart ? 800 - chartPtHeight - 20 : 800;
  const lines = [title, headers.join(" | "), ...rows.map((row) => row.map((item) => String(item ?? "")).join(" | "))].map((line) => line.replace(/[()\\]/g, "\\$&").slice(0, 110));
  const textOps = `BT /F1 9 Tf 40 ${textTop} Td ${lines.map((line) => `(${line}) Tj 0 -14 Td`).join(" ")} ET`;
  const imageOps = chart ? `q ${chartPtWidth} 0 0 ${chartPtHeight} 40 ${800 - chartPtHeight} cm /Im0 Do Q` : "";
  const stream = `${imageOps} ${textOps}`;

  const resources = chart
    ? `/Resources << /Font << /F1 4 0 R >> /XObject << /Im0 6 0 R >> >>`
    : `/Resources << /Font << /F1 4 0 R >> >>`;

  const objects = [
    `<< /Type /Catalog /Pages 2 0 R >>`,
    `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ${resources} /Contents 5 0 R >>`,
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`,
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  const binaryObjects: Uint8Array[] = [];
  if (chart) {
    const compressed = deflateSync(Buffer.from(chart.rgb));
    objects.push(`<< /Type /XObject /Subtype /Image /Width ${chart.width} /Height ${chart.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${compressed.length} >>\nstream\n`);
    binaryObjects[objects.length - 1] = compressed;
  }

  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [encoder.encode("%PDF-1.4\n")];
  const offsets: number[] = [0];
  let length = parts[0].length;
  for (let i = 0; i < objects.length; i++) {
    offsets.push(length);
    const head = encoder.encode(`${i + 1} 0 obj\n${objects[i]}`);
    parts.push(head);
    length += head.length;
    if (binaryObjects[i]) {
      parts.push(binaryObjects[i]);
      length += binaryObjects[i].length;
    }
    const tail = encoder.encode(binaryObjects[i] ? `\nendstream\nendobj\n` : `\nendobj\n`);
    parts.push(tail);
    length += tail.length;
  }
  const xref = length;
  const trailer = encoder.encode(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  parts.push(trailer);

  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let cursor = 0;
  for (const part of parts) { output.set(part, cursor); cursor += part.length; }
  return output;
}
