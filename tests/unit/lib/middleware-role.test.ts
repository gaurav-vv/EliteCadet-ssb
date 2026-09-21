import { describe, expect, it } from "vitest";
import { roleForPath } from "@/lib/supabase/middleware";

// This mapping is the entire route-level authorization surface (AGENTS.md
// §10) — a gap or typo here would let one role reach another role's app
// section, so every branch is asserted explicitly rather than spot-checked.
describe("roleForPath", () => {
  it("maps /student and nested paths to student", () => {
    expect(roleForPath("/student")).toBe("student");
    expect(roleForPath("/student/practice/interview")).toBe("student");
  });

  it("maps /onboarding and nested paths to student", () => {
    expect(roleForPath("/onboarding")).toBe("student");
    expect(roleForPath("/onboarding/step-2")).toBe("student");
  });

  it("maps /mentor and nested paths to mentor", () => {
    expect(roleForPath("/mentor")).toBe("mentor");
    expect(roleForPath("/mentor/mentees/123")).toBe("mentor");
  });

  it("maps /academy and nested paths to academy_admin", () => {
    expect(roleForPath("/academy")).toBe("academy_admin");
    expect(roleForPath("/academy/students/456")).toBe("academy_admin");
  });

  it("does not require a role for public routes", () => {
    expect(roleForPath("/")).toBeNull();
    expect(roleForPath("/login")).toBeNull();
    expect(roleForPath("/signup")).toBeNull();
    expect(roleForPath("/forbidden")).toBeNull();
  });

  it("KNOWN GAP: /mentor and /student use unanchored startsWith, so a future top-level " +
    "route sharing that prefix (e.g. /mentorship, /students) would silently inherit its " +
    "role guard instead of being treated as public or getting its own rule — see status.md " +
    "Technical Debt", () => {
    expect(roleForPath("/mentorship")).toBe("mentor");
    expect(roleForPath("/studentship")).toBe("student");
  });
});
