import { describe, expect, it } from "vitest";
import { blockedReason } from "@/lib/auth/blocked";

describe("blockedReason", () => {
  it("lets an active account in an active (or no) academy through", () => {
    expect(blockedReason({ role: "student", status: "active", academy: { status: "active" } })).toBeNull();
    expect(blockedReason({ role: "student", status: "active", academy: null })).toBeNull();
    expect(blockedReason(null)).toBeNull();
  });

  it("blocks a suspended account first", () => {
    expect(blockedReason({ role: "mentor", status: "suspended", academy: { status: "suspended" } })).toBe("account_suspended");
  });

  it("blocks members of a suspended academy, as object or one-element array", () => {
    expect(blockedReason({ role: "mentor", status: "active", academy: { status: "suspended" } })).toBe("academy_suspended");
    expect(blockedReason({ role: "academy_admin", status: "active", academy: [{ status: "suspended" }] })).toBe("academy_suspended");
  });

  it("never blocks a super admin for an academy's status", () => {
    expect(blockedReason({ role: "super_admin", status: "active", academy: { status: "suspended" } })).toBeNull();
  });
});
