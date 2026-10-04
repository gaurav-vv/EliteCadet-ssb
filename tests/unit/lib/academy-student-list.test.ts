import { describe, expect, it } from "vitest";
import {
  buildStudentListHref,
  DEFAULT_STUDENT_PARAMS,
  formatStudentDate,
  hasActiveStudentFilters,
  initialsOf,
  parseStudentListParams,
} from "@/lib/academy/student-list";
import { validateStudentInput } from "@/lib/academy/student-validation";

const BATCH = "3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b";

describe("validateStudentInput", () => {
  it("accepts a name only, trims and collapses whitespace, defaults to no batch", () => {
    expect(validateStudentInput({ fullName: "  Priya   Nair ", batchId: null, status: "active" })).toEqual({
      ok: true,
      value: { fullName: "Priya Nair", batchId: null, status: "active" },
    });
  });

  it("treats the 'none' select value as no batch and keeps a valid batch id", () => {
    expect(validateStudentInput({ fullName: "Priya", batchId: "none", status: "inactive" })).toMatchObject({ ok: true, value: { batchId: null, status: "inactive" } });
    expect(validateStudentInput({ fullName: "Priya", batchId: BATCH, status: "active" })).toMatchObject({ ok: true, value: { batchId: BATCH } });
  });

  it("rejects empty, whitespace-only, too-short and too-long names", () => {
    for (const fullName of ["", "   ", "A", "x".repeat(81)]) {
      expect(validateStudentInput({ fullName, batchId: null, status: "active" })).toMatchObject({ ok: false, errors: { fullName: expect.any(String) } });
    }
  });

  it("rejects a malformed batch id and an unknown status", () => {
    expect(validateStudentInput({ fullName: "Priya", batchId: "not-a-uuid", status: "active" })).toMatchObject({ ok: false, errors: { batchId: expect.any(String) } });
    expect(validateStudentInput({ fullName: "Priya", batchId: null, status: "pending" })).toMatchObject({ ok: false, errors: { status: expect.any(String) } });
  });

  it("allows duplicate names (nothing in validation checks uniqueness)", () => {
    const a = validateStudentInput({ fullName: "Priya Nair", batchId: null, status: "active" });
    const b = validateStudentInput({ fullName: "Priya Nair", batchId: null, status: "active" });
    expect(a).toEqual(b);
    expect(a.ok).toBe(true);
  });
});

describe("student list params <-> URL", () => {
  it("defaults and falls back on bad input", () => {
    expect(parseStudentListParams({})).toEqual(DEFAULT_STUDENT_PARAMS);
    expect(parseStudentListParams({ status: "attention", sort: "x", page: "-2", batch: "'; drop table" })).toEqual(DEFAULT_STUDENT_PARAMS);
  });

  it("accepts a uuid batch, 'none', and trims search", () => {
    expect(parseStudentListParams({ q: " Pri ", batch: BATCH, status: "inactive", sort: "newest", page: "3" })).toEqual({
      q: "Pri",
      batch: BATCH,
      status: "inactive",
      sort: "newest",
      page: 3,
    });
    expect(parseStudentListParams({ batch: "none" }).batch).toBe("none");
  });

  it("omits defaults from URLs and round-trips the rest", () => {
    expect(buildStudentListHref({})).toBe("/academy/students");
    const href = buildStudentListHref({ q: "Pri", batch: BATCH, page: 2 });
    expect(href).toBe(`/academy/students?q=Pri&batch=${BATCH}&page=2`);
    expect(parseStudentListParams(Object.fromEntries(new URL(href, "http://x").searchParams))).toMatchObject({ q: "Pri", batch: BATCH, page: 2 });
  });

  it("reports whether any filter is active", () => {
    expect(hasActiveStudentFilters(DEFAULT_STUDENT_PARAMS)).toBe(false);
    expect(hasActiveStudentFilters({ ...DEFAULT_STUDENT_PARAMS, q: "x" })).toBe(true);
    expect(hasActiveStudentFilters({ ...DEFAULT_STUDENT_PARAMS, status: "active" })).toBe(true);
    expect(hasActiveStudentFilters({ ...DEFAULT_STUDENT_PARAMS, batch: "none" })).toBe(true);
  });
});

describe("display helpers", () => {
  it("formats a timestamp as an IST date", () => {
    expect(formatStudentDate("2026-09-14T10:00:00.000Z")).toBe("14 Sept 2026");
    expect(formatStudentDate("not a date")).toBe("");
  });

  it("derives initials", () => {
    expect(initialsOf("Priya Nair")).toBe("PN");
    expect(initialsOf("Cher")).toBe("C");
    expect(initialsOf("  ")).toBe("?");
  });
});
