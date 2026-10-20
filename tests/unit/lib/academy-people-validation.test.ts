import { describe, expect, it } from "vitest";
import { buildStudentHref, checkPersonInput, hasActiveStudentFilters, parseStudentParams } from "@/lib/server/academy-people/validation";

const BATCH = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";

describe("parseStudentParams", () => {
  it("defaults, accepts a batch uuid or 'none', and rejects anything else", () => {
    expect(parseStudentParams({})).toEqual({ q: "", batch: "all", status: "all", sort: "name", page: 1 });
    expect(parseStudentParams({ batch: BATCH }).batch).toBe(BATCH);
    expect(parseStudentParams({ batch: "none" }).batch).toBe("none");
    expect(parseStudentParams({ batch: "' or 1=1", status: "inactive", sort: "performance", page: "-1" })).toEqual({ q: "", batch: "all", status: "all", sort: "name", page: 1 });
  });

  it("builds hrefs without defaults and detects filters", () => {
    expect(buildStudentHref({})).toBe("/academy/students");
    expect(buildStudentHref({ batch: "none", page: 2 })).toBe("/academy/students?batch=none&page=2");
    expect(hasActiveStudentFilters(parseStudentParams({ sort: "newest" }))).toBe(false);
    expect(hasActiveStudentFilters(parseStudentParams({ status: "suspended" }))).toBe(true);
  });
});

describe("checkPersonInput", () => {
  it("needs a valid email; a name only when inviting", () => {
    expect(checkPersonInput({ email: " Asha@Example.com " }, false)).toEqual({ ok: true, email: "asha@example.com", fullName: "" });
    expect(checkPersonInput({ email: "nope" }, false)).toMatchObject({ ok: false, field: "email" });
    expect(checkPersonInput({ email: "a@b.co", fullName: "A" }, true)).toMatchObject({ ok: false, field: "fullName" });
    expect(checkPersonInput({ email: "a@b.co", fullName: "  Asha   Rao " }, true)).toEqual({ ok: true, email: "a@b.co", fullName: "Asha Rao" });
  });
});
