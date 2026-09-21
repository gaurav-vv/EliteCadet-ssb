// Client-callable auth operations (AGENTS.md §9) — the only place browser
// code talks to Supabase Auth directly. Logout and other server-only auth
// work lives in lib/auth/actions.ts as Server Actions.

import { createClient } from "@/lib/supabase/client";
import type { AuthResult, LoginInput, SignupInput } from "@/types/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | null {
  if (!email.trim()) return "Email is required.";
  if (!EMAIL_RE.test(email)) return "Enter a valid email address.";
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

export async function signUp(input: SignupInput): Promise<AuthResult<{ role: string }>> {
  const fieldErrors = validateSignupInput(input);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: { code: "validation_error", message: Object.values(fieldErrors)[0] } };
  }

  const supabase = createClient();

  try {
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          full_name: input.fullName,
          role: input.role,
          academy_name: input.academyName ?? null,
        },
      },
    });

    if (error) {
      if (error.message.toLowerCase().includes("already registered") || error.code === "user_already_exists") {
        return { ok: false, error: { code: "email_in_use", message: "An account with this email already exists." } };
      }
      return { ok: false, error: { code: "unknown_error", message: "We couldn't create your account. Please try again." } };
    }

    if (!data.session) {
      return { ok: false, error: { code: "unknown_error", message: "Account created, but sign-in failed. Please log in." } };
    }

    return { ok: true, data: { role: input.role } };
  } catch {
    return { ok: false, error: { code: "network_error", message: "Network error. Check your connection and try again." } };
  }
}

export async function logIn(input: LoginInput): Promise<AuthResult<{ role: string }>> {
  const fieldErrors = validateLoginInput(input);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: { code: "validation_error", message: Object.values(fieldErrors)[0] } };
  }

  const supabase = createClient();

  try {
    const { data, error } = await supabase.auth.signInWithPassword(input);

    if (error) {
      return { ok: false, error: { code: "invalid_credentials", message: "Incorrect email or password." } };
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();

    return { ok: true, data: { role: profile?.role ?? "student" } };
  } catch {
    return { ok: false, error: { code: "network_error", message: "Network error. Check your connection and try again." } };
  }
}

export async function requestPasswordReset(email: string): Promise<AuthResult<null>> {
  const emailError = validateEmail(email);
  if (emailError) {
    return { ok: false, error: { code: "validation_error", message: emailError } };
  }

  const supabase = createClient();

  try {
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
  } catch {
    // Fall through — never reveal whether the email exists either way.
  }

  return { ok: true, data: null };
}

export async function updatePassword(password: string): Promise<AuthResult<null>> {
  const passwordError = validatePassword(password);
  if (passwordError) {
    return { ok: false, error: { code: "validation_error", message: passwordError } };
  }

  const supabase = createClient();

  try {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      return { ok: false, error: { code: "unknown_error", message: "We couldn't update your password. Please try again." } };
    }
    return { ok: true, data: null };
  } catch {
    return { ok: false, error: { code: "network_error", message: "Network error. Check your connection and try again." } };
  }
}
