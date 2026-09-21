import { describe, expect, it } from "vitest";
import {
  validateEmail,
  validateLoginInput,
  validatePassword,
  validateSignupInput,
} from "@/lib/api/auth";

describe("validateEmail", () => {
  it("rejects an empty email", () => {
    expect(validateEmail("")).toBe("Email is required.");
  });

  it("rejects an email with no @", () => {
    expect(validateEmail("not-an-email")).toBe("Enter a valid email address.");
  });

  it("rejects an email with no domain", () => {
    expect(validateEmail("person@")).toBe("Enter a valid email address.");
  });

  it("accepts a well-formed email", () => {
    expect(validateEmail("cadet@example.com")).toBeNull();
  });
});

describe("validatePassword", () => {
  it("rejects an empty password", () => {
    expect(validatePassword("")).toBe("Password is required.");
  });

  it("rejects a password under 8 characters", () => {
    expect(validatePassword("short1")).toBe("Password must be at least 8 characters.");
  });

  it("accepts an 8+ character password", () => {
    expect(validatePassword("longenough")).toBeNull();
  });
});

describe("validateSignupInput", () => {
  const base = {
    email: "cadet@example.com",
    password: "longenough",
    fullName: "Cadet Sharma",
    role: "student" as const,
  };

  it("returns no errors for a valid student signup", () => {
    expect(validateSignupInput(base)).toEqual({});
  });

  it("requires a full name", () => {
    const errors = validateSignupInput({ ...base, fullName: "  " });
    expect(errors.fullName).toBe("Name is required.");
  });

  it("requires an academy name when role is academy_admin", () => {
    const errors = validateSignupInput({ ...base, role: "academy_admin", academyName: "" });
    expect(errors.academyName).toBe("Academy name is required.");
  });

  it("does not require an academy name for a student", () => {
    const errors = validateSignupInput({ ...base, role: "student" });
    expect(errors.academyName).toBeUndefined();
  });

  it("collects multiple field errors at once", () => {
    const errors = validateSignupInput({ email: "bad", password: "short", fullName: "", role: "student" });
    expect(Object.keys(errors).sort()).toEqual(["email", "fullName", "password"]);
  });
});

describe("validateLoginInput", () => {
  it("returns no errors for valid credentials", () => {
    expect(validateLoginInput({ email: "cadet@example.com", password: "anything" })).toEqual({});
  });

  it("requires a password even when email is valid", () => {
    const errors = validateLoginInput({ email: "cadet@example.com", password: "" });
    expect(errors.password).toBe("Password is required.");
  });

  it("flags an invalid email", () => {
    const errors = validateLoginInput({ email: "bad", password: "x" });
    expect(errors.email).toBe("Enter a valid email address.");
  });
});
