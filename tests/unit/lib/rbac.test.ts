import { describe, expect, it } from "vitest";
import { can, isRole, roleRequiresAcademy, ROLES, WORKSPACE_PATH } from "@/lib/server/permissions/rbac";

describe("rbac", () => {
  it("gives every user-management permission to super_admin only", () => {
    for (const p of ["users.read", "users.change_role", "users.change_status", "academies.read_all", "audit.read"] as const) {
      expect(can("super_admin", p)).toBe(true);
      expect(can("academy_admin", p)).toBe(false);
      expect(can("mentor", p)).toBe(false);
      expect(can("student", p)).toBe(false);
    }
  });

  it("denies everything to no role", () => {
    expect(can(null, "users.read")).toBe(false);
    expect(can(undefined, "users.read")).toBe(false);
  });

  it("recognises exactly the four roles", () => {
    expect(ROLES).toEqual(["student", "mentor", "academy_admin", "super_admin"]);
    expect(isRole("super_admin")).toBe(true);
    expect(isRole("admin")).toBe(false);
    expect(isRole(undefined)).toBe(false);
  });

  it("maps each role to its own workspace", () => {
    expect(WORKSPACE_PATH).toEqual({ student: "/student", mentor: "/mentor", academy_admin: "/academy", super_admin: "/admin" });
  });

  it("requires an academy for mentors and academy admins only", () => {
    expect(roleRequiresAcademy("mentor")).toBe(true);
    expect(roleRequiresAcademy("academy_admin")).toBe(true);
    expect(roleRequiresAcademy("student")).toBe(false);
    expect(roleRequiresAcademy("super_admin")).toBe(false);
  });
});
