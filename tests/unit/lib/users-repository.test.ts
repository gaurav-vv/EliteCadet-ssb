import { describe, expect, it } from "vitest";
import { toUserRecord } from "@/lib/server/users/repository";

describe("toUserRecord (boundary validation, AGENTS.md §9)", () => {
  const row = { id: "u1", full_name: "Asha", email: "a@x.co", phone: null, role: "mentor", status: "active", academy_id: "ac1", last_login_at: null, created_at: "2026-10-01T00:00:00Z", academy: { name: "Target Defence" } };

  it("maps a well-formed row, including the embedded academy", () => {
    expect(toUserRecord(row)).toEqual({
      id: "u1",
      fullName: "Asha",
      email: "a@x.co",
      phone: null,
      role: "mentor",
      status: "active",
      academyId: "ac1",
      academyName: "Target Defence",
      lastLoginAt: null,
      createdAt: row.created_at,
    });
    expect(toUserRecord({ ...row, academy: [{ name: "X" }] })?.academyName).toBe("X");
  });

  it("drops rows with a missing id/date or an unknown role", () => {
    expect(toUserRecord(null)).toBeNull();
    expect(toUserRecord({ ...row, id: 5 })).toBeNull();
    expect(toUserRecord({ ...row, created_at: null })).toBeNull();
    expect(toUserRecord({ ...row, role: "owner" })).toBeNull();
  });

  it("defaults an unknown status to active only for display, and tolerates missing optional fields", () => {
    const r = toUserRecord({ id: "u1", role: "student", created_at: row.created_at });
    expect(r).toMatchObject({ fullName: "", email: null, academyName: null, status: "active" });
  });
});
