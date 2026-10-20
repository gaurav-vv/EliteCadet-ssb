import { describe, expect, it } from "vitest";
import { dashboardPathForRole } from "@/lib/auth/redirect";

describe("dashboardPathForRole", () => {
  it("routes students to /student", () => {
    expect(dashboardPathForRole("student")).toBe("/student");
  });

  it("routes mentors to /mentor", () => {
    expect(dashboardPathForRole("mentor")).toBe("/mentor");
  });

  it("routes academy admins to /academy", () => {
    expect(dashboardPathForRole("academy_admin")).toBe("/academy");
  });

  it("routes super admins to /admin", () => {
    expect(dashboardPathForRole("super_admin")).toBe("/admin");
  });

  it("defaults an unrecognized role to /student rather than throwing", () => {
    expect(dashboardPathForRole("something_unexpected")).toBe("/student");
  });
});
