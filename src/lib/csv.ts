/**
 * Minimal dependency-free CSV. Only what the import/export screens need:
 * comma-separated, double-quote quoting, `""` for an escaped quote inside a
 * quoted field, CRLF or LF line endings. Not a general-purpose CSV library —
 * no custom delimiters, no streaming.
 */

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  // Strip a leading UTF-8 BOM — Excel adds one to every CSV it saves.
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  for (let i = 0; i < src.length; i++) {
    const c = src[i];

    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      // A blank line inside the data (not just trailing) would otherwise
      // produce a phantom all-empty row that downstream validation has to
      // special-case — drop it here instead.
      if (row.some((v) => v !== "")) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }

  // Last field/row has no trailing newline to trigger the push above.
  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.some((v) => v !== "")) rows.push(row);
  }

  return rows;
}

function escapeField(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows
    .map((row) => row.map((v) => escapeField(v === null || v === undefined ? "" : String(v))).join(","))
    .join("\r\n");
}

/** Turns parsed rows (header + data) into header-keyed objects, header-order independent. */
export function rowsToRecords(rows: string[][]): Record<string, string>[] {
  if (rows.length === 0) return [];
  const [header, ...data] = rows;
  const keys = header.map((h) => h.trim());
  return data.map((row) => {
    const record: Record<string, string> = {};
    keys.forEach((key, i) => {
      record[key] = (row[i] ?? "").trim();
    });
    return record;
  });
}
