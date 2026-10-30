// A small RFC 4180 CSV reader (pure; no dependency). Handles a UTF-8 byte-order mark, CRLF / LF / CR
// line ends, quoted values with commas, line breaks and doubled quotes, and empty cells. Blank lines
// are skipped. Malformed input (an unterminated quote, or a quote in the middle of an unquoted
// value) throws CsvParseError, so a damaged file is refused instead of read as something else.

export class CsvParseError extends Error {
  constructor(
    message: string,
    readonly line: number,
  ) {
    super(message);
    this.name = "CsvParseError";
  }
}

export function parseCsv(input: string): string[][] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const records: string[][] = [];
  let record: string[] = [];
  let value = "";
  let inQuotes = false;
  let wasQuoted = false; // the current value began with a quote
  let line = 1;
  let i = 0;

  const endValue = () => {
    record.push(value);
    value = "";
    wasQuoted = false;
  };
  const endRecord = () => {
    endValue();
    // A line with a single empty cell is a blank line, not a record.
    if (!(record.length === 1 && record[0] === "")) records.push(record);
    record = [];
  };

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          value += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        // After a closing quote only a separator or a line end may follow.
        const next = text[i];
        if (next !== undefined && next !== "," && next !== "\n" && next !== "\r") throw new CsvParseError("Unexpected text after a closing quote.", line);
        continue;
      }
      if (ch === "\n") line += 1;
      value += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      if (value !== "" || wasQuoted) throw new CsvParseError("A quote appears in the middle of a value.", line);
      inQuotes = true;
      wasQuoted = true;
      i += 1;
      continue;
    }
    if (ch === ",") {
      endValue();
      i += 1;
      continue;
    }
    if (ch === "\r" || ch === "\n") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      endRecord();
      line += 1;
      i += 1;
      continue;
    }
    value += ch;
    i += 1;
  }
  if (inQuotes) throw new CsvParseError("A quoted value is never closed.", line);
  if (value !== "" || wasQuoted || record.length > 0) endRecord();
  return records;
}

// Spreadsheets run a cell that starts with = + - or @ as a formula. Anything written back out as CSV
// (the failed-rows download) is neutralised with a leading apostrophe and quoted when needed.
export function csvCell(raw: string): string {
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(rows: string[][]): string {
  return rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
