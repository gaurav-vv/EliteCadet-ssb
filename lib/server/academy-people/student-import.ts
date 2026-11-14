// Bulk student import: reading and checking a CSV (pure; no database, no browser APIs, so the same code
// runs in the browser for the preview and again on the server before anything is created). The server
// never trusts what the browser says it validated.
//
// The file has the same two fields as the Add student form: email and full_name. There is no academy,
// role or any other column: those always come from the signed-in academy admin's session.

import { CsvParseError, parseCsv } from "@/lib/csv/parse-csv";

export const IMPORT_MAX_FILE_BYTES = 256 * 1024;
export const IMPORT_MAX_ROWS = 500;
// Rows per server request. Importing sends one invitation email per new student, so requests stay
// small: a slow or rate-limited mail service stops the import early instead of timing out.
export const IMPORT_CHUNK_SIZE = 10;
export const IMPORT_PREVIEW_CHUNK_SIZE = 50;

export const STUDENT_CSV_COLUMNS = ["email", "full_name"] as const;
// Header only: a template with sample people could be uploaded unchanged and email strangers.
export const STUDENT_CSV_TEMPLATE = "email,full_name\r\n";

const HEADER_ALIASES: Record<(typeof STUDENT_CSV_COLUMNS)[number], string[]> = {
  email: ["email", "e_mail", "email_address"],
  full_name: ["full_name", "fullname", "name", "student_name"],
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FORMULA_START = /^[=+\-@\t\r]/;
const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

export interface ImportRow {
  /** Spreadsheet row number: the header is row 1, so the first student is row 2. */
  row: number;
  email: string;
  fullName: string;
  /** The line had more cells than the header: usually a comma inside an unquoted value. */
  extraCells?: boolean;
}

export type ParsedStudentCsv = { ok: true; rows: ImportRow[]; ignoredColumns: string[] } | { ok: false; message: string };

const normalizeHeader = (h: string) => h.trim().toLowerCase().replace(/[\s-]+/g, "_");

export function parseStudentCsv(text: string): ParsedStudentCsv {
  if (typeof text !== "string" || text.trim() === "") return { ok: false, message: "The file is empty. Add a header row (email,full_name) and one student per row." };
  let records: string[][];
  try {
    records = parseCsv(text);
  } catch (error) {
    if (error instanceof CsvParseError) return { ok: false, message: `This doesn't look like a valid CSV file (${error.message.replace(/\.$/, "")}, near line ${error.line}). Check quotes around values that contain commas.` };
    throw error;
  }
  if (records.length === 0) return { ok: false, message: "The file is empty. Add a header row (email,full_name) and one student per row." };

  const header = records[0].map(normalizeHeader);
  const indexOf: Partial<Record<(typeof STUDENT_CSV_COLUMNS)[number], number>> = {};
  for (const column of STUDENT_CSV_COLUMNS) {
    const hits = header.flatMap((h, i) => (HEADER_ALIASES[column].includes(h) ? [i] : []));
    if (hits.length > 1) return { ok: false, message: `The header has the "${column}" column more than once.` };
    if (hits.length === 1) indexOf[column] = hits[0];
  }
  const missing = STUDENT_CSV_COLUMNS.filter((c) => indexOf[c] === undefined);
  if (missing.length > 0) return { ok: false, message: `The header row is missing: ${missing.join(", ")}. Required columns: ${STUDENT_CSV_COLUMNS.join(", ")}. Download the template to start from the right headers.` };

  const used = new Set(Object.values(indexOf));
  const ignoredColumns = records[0].filter((_, i) => !used.has(i)).map((h) => h.trim()).filter(Boolean);
  const data = records.slice(1);
  if (data.length === 0) return { ok: false, message: "The file has a header but no students. Add one student per row." };
  if (data.length > IMPORT_MAX_ROWS) return { ok: false, message: `The file has ${data.length} students; the limit is ${IMPORT_MAX_ROWS} per import. Split it into smaller files.` };

  return {
    ok: true,
    ignoredColumns,
    rows: data.map((cells, i) => ({
      row: i + 2,
      email: cells[indexOf.email!] ?? "",
      fullName: cells[indexOf.full_name!] ?? "",
      ...(cells.length > header.length ? { extraCells: true } : {}),
    })),
  };
}

export type ImportRowStatus = "valid" | "invalid" | "duplicate";

export interface ImportRowCheck {
  row: number;
  email: string;
  fullName: string;
  status: ImportRowStatus;
  issues: string[];
}

export function normalizeImportRow(row: Pick<ImportRow, "email" | "fullName">): { email: string; fullName: string } {
  return { email: row.email.trim().toLowerCase(), fullName: row.fullName.trim().replace(/\s+/g, " ") };
}

// Field rules for one row (the same bar as the Add student form, applied to every row).
export function rowIssues(row: ImportRow): string[] {
  const { email, fullName } = normalizeImportRow(row);
  const issues: string[] = [];
  if (row.extraCells) issues.push("Too many columns on this row. Put quotes around any value that contains a comma.");
  if (!email) issues.push("Missing required field: email.");
  else if (!EMAIL_RE.test(email) || email.length > 254) issues.push("Invalid email address.");
  if (!fullName) issues.push("Missing required field: full_name.");
  else if (fullName.length < 2 || fullName.length > 80) issues.push("Name must be 2 to 80 characters.");
  else if (FORMULA_START.test(fullName)) issues.push("Name can't start with =, +, - or @.");
  else if (CONTROL_CHARS.test(fullName)) issues.push("Name contains characters that aren't allowed.");
  return issues;
}

// Checks every row, and marks a repeated email (case-insensitively) as a duplicate of the first row that
// used it. Rows that are already invalid are not also called duplicates.
export function validateImportRows(rows: ImportRow[]): ImportRowCheck[] {
  const firstSeen = new Map<string, number>();
  return rows.map((row) => {
    const issues = rowIssues(row);
    const { email, fullName } = normalizeImportRow(row);
    if (issues.length > 0) return { row: row.row, email: row.email.trim(), fullName: row.fullName.trim(), status: "invalid", issues };
    const earlier = firstSeen.get(email);
    if (earlier !== undefined) return { row: row.row, email, fullName, status: "duplicate", issues: [`Same email as row ${earlier}; skipped.`] };
    firstSeen.set(email, row.row);
    return { row: row.row, email, fullName, status: "valid", issues: [] };
  });
}

export function summarizeChecks(checks: { status: ImportRowStatus }[]) {
  return {
    total: checks.length,
    valid: checks.filter((c) => c.status === "valid").length,
    invalid: checks.filter((c) => c.status === "invalid").length,
    duplicate: checks.filter((c) => c.status === "duplicate").length,
  };
}

export type FileCheck = { ok: true } | { ok: false; message: string };

// Type and size, before the file is read.
export function checkImportFile(file: { name: string; size: number; type?: string }): FileCheck {
  if (!/\.csv$/i.test(file.name)) return { ok: false, message: "Choose a .csv file. In Excel or Sheets use Save as / Download as CSV." };
  if (file.type && !/^(text\/csv|text\/plain|application\/csv|application\/vnd\.ms-excel)$/i.test(file.type)) return { ok: false, message: "That file isn't a CSV file." };
  if (file.size === 0) return { ok: false, message: "The file is empty." };
  if (file.size > IMPORT_MAX_FILE_BYTES) return { ok: false, message: `The file is too large (${Math.ceil(file.size / 1024)} KB). The limit is ${IMPORT_MAX_FILE_BYTES / 1024} KB.` };
  return { ok: true };
}

// ---- Results shared by the server and the dialog -------------------------------------------------

/** What an email would become, decided against the real accounts (never from the file). */
export type PreviewOutcome = "new" | "join" | "member" | "blocked" | "unknown";
export interface PreviewRow {
  row: number;
  outcome: PreviewOutcome;
  message: string;
}

export type ImportResultKind = "invited" | "joined" | "skipped" | "failed" | "not_processed";
export interface ImportResultRow {
  row: number;
  email: string;
  fullName: string;
  result: ImportResultKind;
  message: string;
}
/** Why a chunk stopped early: the email service's rate limit, or invites not being set up. */
export type ImportStop = "email_limit" | "not_set_up";
