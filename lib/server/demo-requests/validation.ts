// Demo request rules — pure (tests/unit/lib/demo-requests-validation.test.ts).
// Mirrors the CHECK constraints in supabase/migrations/0016_demo_requests.sql.

import type { DemoInterest, DemoRequestInput } from "@/types/demo-requests";

export type DemoFieldErrors = Partial<Record<keyof DemoRequestInput, string>>;

export interface CleanDemoRequest {
  full_name: string;
  email: string;
  phone: string | null;
  organisation: string | null;
  interest: DemoInterest;
  message: string | null;
}

const INTERESTS: DemoInterest[] = ["student", "mentor", "academy"];
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PHONE_RE = /^\+?[0-9 ()-]{7,20}$/;

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export function isDemoInterest(value: unknown): value is DemoInterest {
  return INTERESTS.includes(value as DemoInterest);
}

export function validateDemoRequest(
  input: Partial<Record<keyof DemoRequestInput, unknown>>,
): { ok: true; value: CleanDemoRequest } | { ok: false; fieldErrors: DemoFieldErrors } {
  const fullName = str(input.fullName);
  const email = str(input.email).toLowerCase();
  const phone = str(input.phone);
  const organisation = str(input.organisation);
  const message = str(input.message);
  const errors: DemoFieldErrors = {};

  if (fullName.length < 2 || fullName.length > 80) errors.fullName = "Enter your name (2–80 characters).";
  if (!EMAIL_RE.test(email) || email.length > 254) errors.email = "Enter a valid email address.";
  if (phone && !PHONE_RE.test(phone)) errors.phone = "Enter a valid phone number, or leave it empty.";
  if (!isDemoInterest(input.interest)) errors.interest = "Choose what you're interested in.";
  if (organisation.length > 120) errors.organisation = "Keep this under 120 characters.";
  if (input.interest === "academy" && !organisation) errors.organisation = "Enter your academy or institution's name.";
  if (message.length > 1000) errors.message = "Keep your message under 1,000 characters.";

  if (Object.keys(errors).length > 0) return { ok: false, fieldErrors: errors };
  return {
    ok: true,
    value: {
      full_name: fullName,
      email,
      phone: phone || null,
      organisation: organisation || null,
      interest: input.interest as DemoInterest,
      message: message || null,
    },
  };
}
