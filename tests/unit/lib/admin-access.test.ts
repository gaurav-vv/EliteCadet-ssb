import { describe, expect, it } from "vitest";
import { adminRequirementForPath, canAccess, isAdminArea, parseGrantInput } from "@/lib/admin/access";

// adminRequirementForPath + canAccess are the whole /admin authorization
// surface (AGENTS.md §10), so every branch is asserted explicitly.
describe("adminRequirementForPath", () => {
  it("requires any grant for the overview", () => {
    expect(adminRequirementForPath("/admin")).toBe("any");
  });

  it("maps each content area (and its nested paths) to its own grant", () => {
    expect(adminRequirementForPath("/admin/student-content")).toBe("student_content");
    expect(adminRequirementForPath("/admin/student-content/practice/new")).toBe("student_content");
    expect(adminRequirementForPath("/admin/mentor-content")).toBe("mentor_content");
    expect(adminRequirementForPath("/admin/academy-content/batches")).toBe("academy_content");
  });

  it("requires super for access management and for any unmapped /admin path", () => {
    expect(adminRequirementForPath("/admin/access")).toBe("super");
    expect(adminRequirementForPath("/admin/anything-new")).toBe("super");
  });

  it("is anchored: /administration and other routes are not guarded here", () => {
    expect(adminRequirementForPath("/administration")).toBeNull();
    expect(adminRequirementForPath("/adminer")).toBeNull();
    expect(adminRequirementForPath("/academy")).toBeNull();
    expect(adminRequirementForPath("/")).toBeNull();
  });
});

describe("canAccess", () => {
  it("denies everything to someone with no grants", () => {
    expect(canAccess([], "any")).toBe(false);
    expect(canAccess([], "student_content")).toBe(false);
    expect(canAccess([], "super")).toBe(false);
  });

  it("gives an area editor only their own area plus the overview", () => {
    expect(canAccess(["mentor_content"], "any")).toBe(true);
    expect(canAccess(["mentor_content"], "mentor_content")).toBe(true);
    expect(canAccess(["mentor_content"], "student_content")).toBe(false);
    expect(canAccess(["mentor_content"], "super")).toBe(false);
  });

  it("lets super reach every requirement", () => {
    for (const required of ["any", "super", "student_content", "mentor_content", "academy_content"] as const) {
      expect(canAccess(["super"], required)).toBe(true);
    }
  });
});

describe("isAdminArea", () => {
  it("accepts only the four known areas", () => {
    expect(isAdminArea("super")).toBe(true);
    expect(isAdminArea("student_content")).toBe(true);
    expect(isAdminArea("owner")).toBe(false);
    expect(isAdminArea(undefined)).toBe(false);
    expect(isAdminArea(1)).toBe(false);
  });
});

describe("parseGrantInput", () => {
  it("normalises the email and accepts a known area", () => {
    expect(parseGrantInput({ email: "  Editor@Example.COM ", area: "student_content" })).toEqual({
      ok: true,
      value: { email: "editor@example.com", area: "student_content" },
    });
  });

  it("rejects a malformed or missing email", () => {
    for (const email of ["", "nope", "a@b", "a b@c.com", undefined, 5]) {
      expect(parseGrantInput({ email, area: "super" }).ok).toBe(false);
    }
  });

  it("rejects an unknown area", () => {
    expect(parseGrantInput({ email: "a@b.co", area: "root" }).ok).toBe(false);
    expect(parseGrantInput({ email: "a@b.co" }).ok).toBe(false);
  });
});
