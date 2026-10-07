import { describe, expect, it } from "vitest";
import {
  buildUserListQuery,
  checkRoleChange,
  checkStatusChange,
  hasActiveUserFilters,
  parseUserListParams,
  sanitizeSearch,
} from "@/lib/server/users/validation";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

describe("parseUserListParams", () => {
  it("defaults everything for an empty URL", () => {
    expect(parseUserListParams({})).toEqual({ q: "", role: "all", status: "all", sort: "newest", page: 1 });
  });

  it("keeps valid values and trims/limits the search", () => {
    expect(parseUserListParams({ q: "  asha ", role: "mentor", status: "suspended", sort: "name", page: "3" })).toEqual({
      q: "asha",
      role: "mentor",
      status: "suspended",
      sort: "name",
      page: 3,
    });
    expect(parseUserListParams({ q: "x".repeat(200) }).q).toHaveLength(80);
  });

  it("falls back on unknown or hostile values", () => {
    expect(parseUserListParams({ role: "root", status: "deleted", sort: "drop table", page: "-2" })).toEqual({
      q: "",
      role: "all",
      status: "all",
      sort: "newest",
      page: 1,
    });
    expect(parseUserListParams({ role: ["mentor", "student"] }).role).toBe("mentor");
  });
});

describe("buildUserListQuery / hasActiveUserFilters", () => {
  it("omits defaults and round-trips", () => {
    expect(buildUserListQuery({})).toBe("");
    const q = buildUserListQuery({ role: "student", page: 2 });
    expect(q).toBe("?role=student&page=2");
    expect(parseUserListParams(Object.fromEntries(new URLSearchParams(q)))).toMatchObject({ role: "student", page: 2 });
  });

  it("detects filters but not sort/page", () => {
    expect(hasActiveUserFilters(parseUserListParams({ sort: "name", page: "4" }))).toBe(false);
    expect(hasActiveUserFilters(parseUserListParams({ status: "active" }))).toBe(true);
  });
});

describe("sanitizeSearch", () => {
  it("escapes ILIKE wildcards and removes PostgREST filter syntax", () => {
    expect(sanitizeSearch("100%_a\\b")).toBe("100\\%\\_a\\\\b");
    expect(sanitizeSearch("a,role.eq.super_admin)")).toBe("a role.eq.super\\_admin");
  });
});

describe("checkRoleChange", () => {
  const base = { actorId: A, targetId: B, targetAcademyId: null, currentRole: "student" as const };

  it("allows a valid change", () => {
    expect(checkRoleChange({ ...base, newRole: "super_admin" })).toEqual({ ok: true, role: "super_admin" });
  });

  it("refuses an unknown role, a self-change and a no-op", () => {
    expect(checkRoleChange({ ...base, newRole: "owner" }).ok).toBe(false);
    expect(checkRoleChange({ ...base, targetId: A, newRole: "mentor" }).ok).toBe(false);
    expect(checkRoleChange({ ...base, newRole: "student" }).ok).toBe(false);
  });

  it("requires an academy for mentor and academy admin", () => {
    expect(checkRoleChange({ ...base, newRole: "mentor" }).ok).toBe(false);
    expect(checkRoleChange({ ...base, newRole: "academy_admin" }).ok).toBe(false);
    expect(checkRoleChange({ ...base, targetAcademyId: "acad-1", newRole: "mentor" })).toEqual({ ok: true, role: "mentor" });
  });
});

describe("checkStatusChange", () => {
  it("allows suspend and reactivate of someone else", () => {
    expect(checkStatusChange({ actorId: A, targetId: B, currentStatus: "active", newStatus: "suspended" })).toEqual({ ok: true, status: "suspended" });
    expect(checkStatusChange({ actorId: A, targetId: B, currentStatus: "suspended", newStatus: "active" })).toEqual({ ok: true, status: "active" });
  });

  it("refuses self, no-op and unknown status", () => {
    expect(checkStatusChange({ actorId: A, targetId: A, currentStatus: "active", newStatus: "suspended" }).ok).toBe(false);
    expect(checkStatusChange({ actorId: A, targetId: B, currentStatus: "active", newStatus: "active" }).ok).toBe(false);
    expect(checkStatusChange({ actorId: A, targetId: B, currentStatus: "active", newStatus: "deleted" }).ok).toBe(false);
  });
});
