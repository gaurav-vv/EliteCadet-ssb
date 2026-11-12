// Pure sign-up and login field checks (no browser or server APIs), shared by the forms and by
// lib/api/auth.ts, which re-exports them. They give quick, field-specific answers; Supabase Auth and the
// database enforce their own rules again on the server.

import type { LoginInput, SignupInput } from "@/types/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | null {
  if (!email.trim()) return "Email is required.";
  if (!EMAIL_RE.test(email.trim())) return "Enter a valid email address.";
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  return null;
}

export function validateSignupInput(input: SignupInput): Record<string, string> {
  const errors: Record<string, string> = {};
  const emailError = validateEmail(input.email);
  if (emailError) errors.email = emailError;
  const passwordError = validatePassword(input.password);
  if (passwordError) errors.password = passwordError;
  if (!input.fullName.trim()) errors.fullName = "Name is required.";
  if (input.role === "academy_admin" && !input.academyName?.trim()) {
    errors.academyName = "Academy name is required.";
  }
  return errors;
}

export function validateLoginInput(input: LoginInput): Record<string, string> {
  const errors: Record<string, string> = {};
  const emailError = validateEmail(input.email);
  if (emailError) errors.email = emailError;
  if (!input.password) errors.password = "Password is required.";
  return errors;
}

// The "set a new password" form: the new password has to meet the same rule as sign-up, and the
// confirmation has to match it exactly. Supabase Auth applies its own password rules again on the server.
export function validateNewPasswordForm(input: { password: string; confirm: string }): { password?: string; confirm?: string } {
  const errors: { password?: string; confirm?: string } = {};
  const passwordError = validatePassword(input.password);
  if (passwordError) errors.password = passwordError;
  if (!input.confirm) errors.confirm = "Confirm your new password.";
  else if (input.confirm !== input.password) errors.confirm = "The passwords don't match.";
  return errors;
}
