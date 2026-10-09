import { describe, expect, it } from "vitest";
import { buildAcademyListQuery, isMemberRole, parseAcademyListParams, validateAcademyInput } from "@/lib/server/academies/validation";

describe("parseAcademyListParams / buildAcademyListQuery", () => {
  it("defaults, keeps valid values, rejects hostile ones", () => {
    expect(parseAcademyListParams({})).toEqual({ q: "", status: "all", sort: "newest", page: 1 });
    expect(parseAcademyListParams({ q: " nda ", status: "suspended", sort: "name", page: "2" })).toEqual({ q: "nda", status: "suspended", sort: "name", page: 2 });
    expect(parseAcademyListParams({ status: "deleted", sort: "x", page: "0" })).toEqual({ q: "", status: "all", sort: "newest", page: 1 });
  });

  it("omits defaults in the URL", () => {
    expect(buildAcademyListQuery({})).toBe("");
    expect(buildAcademyListQuery({ status: "active", page: 3 })).toBe("?status=active&page=3");
  });
});

describe("validateAcademyInput", () => {
  it("cleans a valid form into DB columns, blank optionals → null", () => {
    expect(validateAcademyInput({ name: "  Target   Defence ", description: "", logoUrl: "", contactEmail: "Info@TD.in", contactPhone: "+91 98765 43210" })).toEqual({
      ok: true,
      value: { name: "Target Defence", description: null, logo_url: null, contact_email: "info@td.in", contact_phone: "+91 98765 43210" },
    });
  });

  it("reports each invalid field", () => {
    const r = validateAcademyInput({ name: "A", description: "x".repeat(501), logoUrl: "http://insecure.example/logo.png", contactEmail: "nope", contactPhone: "abc" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["contactEmail", "contactPhone", "description", "logoUrl", "name"]);
  });

  it("rejects non-https and malformed logo links, and non-string input", () => {
    expect(validateAcademyInput({ name: "Valid", logoUrl: "javascript:alert(1)" }).ok).toBe(false);
    expect(validateAcademyInput({ name: "Valid", logoUrl: "not a url" }).ok).toBe(false);
    expect(validateAcademyInput({ name: 42 }).ok).toBe(false);
    expect(validateAcademyInput({ name: "Valid", logoUrl: "https://cdn.example.com/logo.png" }).ok).toBe(true);
  });
});

describe("isMemberRole", () => {
  it("allows only academy roles, never super_admin", () => {
    expect(isMemberRole("student")).toBe(true);
    expect(isMemberRole("mentor")).toBe(true);
    expect(isMemberRole("academy_admin")).toBe(true);
    expect(isMemberRole("super_admin")).toBe(false);
  });
});
