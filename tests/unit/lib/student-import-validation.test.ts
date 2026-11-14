// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  IMPORT_MAX_FILE_BYTES,
  IMPORT_MAX_ROWS,
  checkImportFile,
  parseStudentCsv,
  summarizeChecks,
  validateImportRows,
  type ImportRow,
} from "@/lib/server/academy-people/student-import";

const ok = (csv: string) => {
  const r = parseStudentCsv(csv);
  if (!r.ok) throw new Error(r.message);
  return r;
};

describe("parseStudentCsv: the file", () => {
  it("reads a valid file and numbers rows like a spreadsheet (header is row 1)", () => {
    const { rows } = ok("email,full_name\nasha@x.co,Asha Rao\nben@x.co,Ben Roy\n");
    expect(rows.map((r) => [r.row, r.email, r.fullName])).toEqual([[2, "asha@x.co", "Asha Rao"], [3, "ben@x.co", "Ben Roy"]]);
  });

  it("accepts header spelling variants, any order, quoted commas, and ignores extra columns", () => {
    const parsed = ok('Name , E-mail ,Notes\n"Rao, Asha",asha@x.co,vip\n');
    expect(parsed.rows[0]).toMatchObject({ email: "asha@x.co", fullName: "Rao, Asha" });
    expect(parsed.ignoredColumns).toEqual(["Notes"]);
  });

  it("refuses an empty file, a header-only file and whitespace", () => {
    for (const text of ["", "   \n", "\n\n"]) expect(parseStudentCsv(text)).toMatchObject({ ok: false, message: expect.stringMatching(/empty/i) });
    expect(parseStudentCsv("email,full_name\n")).toMatchObject({ ok: false, message: expect.stringMatching(/no students/i) });
  });

  it("names the missing header columns", () => {
    expect(parseStudentCsv("email,phone\na@x.co,1")).toMatchObject({ ok: false, message: expect.stringContaining("full_name") });
    expect(parseStudentCsv("name\nAsha")).toMatchObject({ ok: false, message: expect.stringContaining("email") });
  });

  it("refuses a repeated column", () => {
    expect(parseStudentCsv("email,email,full_name\na@x.co,b@x.co,Asha")).toMatchObject({ ok: false, message: expect.stringMatching(/more than once/) });
  });

  it("refuses a malformed file with a plain message", () => {
    const r = parseStudentCsv('email,full_name\n"a@x.co,Asha');
    expect(r).toMatchObject({ ok: false, message: expect.stringMatching(/valid CSV/i) });
  });

  it("refuses a file over the row limit but accepts exactly the limit", () => {
    const body = (n: number) => Array.from({ length: n }, (_, i) => `s${i}@x.co,Student ${i}`).join("\n");
    expect(ok(`email,full_name\n${body(IMPORT_MAX_ROWS)}`).rows).toHaveLength(IMPORT_MAX_ROWS);
    expect(parseStudentCsv(`email,full_name\n${body(IMPORT_MAX_ROWS + 1)}`)).toMatchObject({ ok: false, message: expect.stringContaining(String(IMPORT_MAX_ROWS)) });
  });

  it("flags a row with more cells than the header (an unquoted comma)", () => {
    const { rows } = ok("email,full_name\na@x.co,Rao, Asha\n");
    expect(rows[0].extraCells).toBe(true);
    expect(validateImportRows(rows)[0]).toMatchObject({ status: "invalid", issues: [expect.stringMatching(/Too many columns/)] });
  });
});

describe("validateImportRows: each row", () => {
  const row = (r: number, email: string, fullName: string): ImportRow => ({ row: r, email, fullName });

  it("passes a good row, normalising case and spaces", () => {
    expect(validateImportRows([row(2, "  Asha@X.co ", "  Asha   Rao ")])[0]).toMatchObject({ status: "valid", email: "asha@x.co", fullName: "Asha Rao", issues: [] });
  });

  it.each([
    ["no @", "asha.x.co"],
    ["no domain dot", "asha@x"],
    ["spaces inside", "as ha@x.co"],
    ["two @", "a@@x.co"],
  ])("rejects an invalid email (%s)", (_n, email) => {
    expect(validateImportRows([row(2, email, "Asha Rao")])[0]).toMatchObject({ status: "invalid", issues: ["Invalid email address."] });
  });

  it("rejects missing required fields, each named", () => {
    expect(validateImportRows([row(2, "", "Asha Rao")])[0].issues).toEqual(["Missing required field: email."]);
    expect(validateImportRows([row(3, "a@x.co", "  ")])[0].issues).toEqual(["Missing required field: full_name."]);
    expect(validateImportRows([row(4, "", "")])[0].issues).toHaveLength(2);
  });

  it("rejects too short / too long names and spreadsheet formulas", () => {
    expect(validateImportRows([row(2, "a@x.co", "A")])[0].issues[0]).toMatch(/2 to 80/);
    expect(validateImportRows([row(2, "a@x.co", "x".repeat(81))])[0].issues[0]).toMatch(/2 to 80/);
    for (const name of ["=HYPERLINK(1)", "+91 99", "-cmd", "@sum"]) expect(validateImportRows([row(2, "a@x.co", name)])[0].issues[0]).toMatch(/can't start with/);
  });

  it("rejects control characters in a name", () => {
    expect(validateImportRows([row(2, "a@x.co", "As\u0007ha")])[0].issues[0]).toMatch(/aren't allowed/);
  });

  it("marks a repeated email as a duplicate of the first row, case-insensitively, and keeps the first", () => {
    const checks = validateImportRows([row(2, "a@x.co", "Asha"), row(3, "B@x.co", "Ben"), row(4, "A@X.co", "Asha Again"), row(5, "b@x.co", "Ben Again")]);
    expect(checks.map((c) => c.status)).toEqual(["valid", "valid", "duplicate", "duplicate"]);
    expect(checks[2].issues).toEqual(["Same email as row 2; skipped."]);
  });

  it("does not call an invalid row a duplicate, and never lets an invalid first row shadow a later good one", () => {
    const checks = validateImportRows([row(2, "a@x.co", ""), row(3, "a@x.co", "Asha Rao")]);
    expect(checks.map((c) => c.status)).toEqual(["invalid", "valid"]);
  });

  it("summarises counts", () => {
    const checks = validateImportRows([row(2, "a@x.co", "Asha"), row(3, "bad", "Ben"), row(4, "a@x.co", "Asha")]);
    expect(summarizeChecks(checks)).toEqual({ total: 3, valid: 1, invalid: 1, duplicate: 1 });
  });
});

describe("checkImportFile", () => {
  it("accepts a .csv within the size limit", () => {
    expect(checkImportFile({ name: "students.CSV", size: 1200, type: "text/csv" })).toEqual({ ok: true });
    expect(checkImportFile({ name: "students.csv", size: 1200, type: "" })).toEqual({ ok: true });
  });
  it("refuses other types, empty files and oversized files", () => {
    expect(checkImportFile({ name: "students.xlsx", size: 10 })).toMatchObject({ ok: false });
    expect(checkImportFile({ name: "students.csv", size: 10, type: "image/png" })).toMatchObject({ ok: false });
    expect(checkImportFile({ name: "students.csv", size: 0 })).toMatchObject({ ok: false });
    expect(checkImportFile({ name: "students.csv", size: IMPORT_MAX_FILE_BYTES + 1 })).toMatchObject({ ok: false, message: expect.stringMatching(/too large/) });
  });
});
