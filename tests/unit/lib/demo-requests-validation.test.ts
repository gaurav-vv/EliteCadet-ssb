import { describe, expect, it } from "vitest";
import { isDemoInterest, validateDemoRequest } from "@/lib/server/demo-requests/validation";

const base = { fullName: "Asha Rao", email: "Asha@Example.com", phone: "", organisation: "", interest: "student", message: "" };

describe("validateDemoRequest", () => {
  it("cleans a valid request: trims, lower-cases the email, empty optionals become null", () => {
    expect(validateDemoRequest({ ...base, fullName: "  Asha Rao " })).toEqual({
      ok: true,
      value: { full_name: "Asha Rao", email: "asha@example.com", phone: null, organisation: null, interest: "student", message: null },
    });
  });

  it("reports every invalid field at once", () => {
    const result = validateDemoRequest({ ...base, fullName: "A", email: "not-an-email", phone: "abc", interest: "hacker" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.fieldErrors).sort()).toEqual(["email", "fullName", "interest", "phone"]);
  });

  it("requires an organisation name for academies only", () => {
    const academy = validateDemoRequest({ ...base, interest: "academy" });
    expect(academy.ok).toBe(false);
    if (!academy.ok) expect(academy.fieldErrors.organisation).toBeDefined();
    expect(validateDemoRequest({ ...base, interest: "academy", organisation: "Shaurya Academy" }).ok).toBe(true);
  });

  it("enforces the same length limits as the database", () => {
    const result = validateDemoRequest({ ...base, message: "x".repeat(1001), organisation: "y".repeat(121) });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.fieldErrors).sort()).toEqual(["message", "organisation"]);
  });

  it("recognises only the three interests", () => {
    expect(["student", "mentor", "academy"].every(isDemoInterest)).toBe(true);
    expect(isDemoInterest("super_admin")).toBe(false);
  });
});
