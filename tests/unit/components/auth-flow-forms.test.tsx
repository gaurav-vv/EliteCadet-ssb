import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignupForm } from "@/components/auth/signup-form";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { establishRecoverySession, requestPasswordReset, signUp, updatePassword } from "@/lib/api/auth";

vi.mock("@/lib/api/auth", () => ({
  signUp: vi.fn(),
  updatePassword: vi.fn(),
  requestPasswordReset: vi.fn(),
  establishRecoverySession: vi.fn(),
}));

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

beforeEach(() => {
  vi.mocked(signUp).mockReset();
  vi.mocked(updatePassword).mockReset();
  vi.mocked(requestPasswordReset).mockReset();
  vi.mocked(establishRecoverySession).mockReset();
  push.mockReset();
});

describe("SignupForm", () => {
  async function fillAndSubmit() {
    const user = userEvent.setup();
    render(<SignupForm />);
    await user.type(screen.getByLabelText(/full name/i), "New Cadet");
    await user.type(screen.getByLabelText(/email/i), "new@example.com");
    await user.type(screen.getByLabelText(/password/i), "correcthorse");
    await user.click(screen.getByRole("button", { name: /create account/i }));
  }

  it("goes to onboarding when the account is signed in straight away", async () => {
    vi.mocked(signUp).mockResolvedValue({ ok: true, data: { role: "student", needsConfirmation: false } });
    await fillAndSubmit();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/onboarding"));
  });

  it("asks the user to confirm their email instead of navigating into a protected page", async () => {
    vi.mocked(signUp).mockResolvedValue({ ok: true, data: { role: "student", needsConfirmation: true } });
    await fillAndSubmit();
    expect(await screen.findByText(/confirm your email/i)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});

describe("ResetPasswordForm", () => {
  it("offers a new link when the recovery session can't be established", async () => {
    vi.mocked(establishRecoverySession).mockResolvedValue("invalid");
    render(<ResetPasswordForm />);
    expect(await screen.findByRole("link", { name: /request a new link/i })).toHaveAttribute("href", "/forgot-password");
    expect(screen.queryByLabelText(/new password/i)).not.toBeInTheDocument();
  });

  it("saves the new password and sends the user to log in", async () => {
    vi.mocked(establishRecoverySession).mockResolvedValue("ready");
    vi.mocked(updatePassword).mockResolvedValue({ ok: true, data: null });
    const user = userEvent.setup();
    render(<ResetPasswordForm />);
    await user.type(await screen.findByLabelText(/new password/i), "brandnewpass");
    await user.click(screen.getByRole("button", { name: /save new password/i }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/login?reason=password_updated"));
  });

  it("switches to the expired-link state if the session lapsed before submit", async () => {
    vi.mocked(establishRecoverySession).mockResolvedValue("ready");
    vi.mocked(updatePassword).mockResolvedValue({ ok: false, error: { code: "link_expired", message: "expired" } });
    const user = userEvent.setup();
    render(<ResetPasswordForm />);
    await user.type(await screen.findByLabelText(/new password/i), "brandnewpass");
    await user.click(screen.getByRole("button", { name: /save new password/i }));
    expect(await screen.findByRole("link", { name: /request a new link/i })).toBeInTheDocument();
  });
});

describe("ForgotPasswordForm", () => {
  it("explains an invalid link it was sent back from", () => {
    render(<ForgotPasswordForm reason="link_invalid" />);
    expect(screen.getByText(/invalid, expired or already used/i)).toBeInTheDocument();
  });

  it("shows the failure instead of 'check your email' when the request fails", async () => {
    vi.mocked(requestPasswordReset).mockResolvedValue({ ok: false, error: { code: "unknown_error", message: "We couldn't send the reset email right now." } });
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);
    await user.type(screen.getByLabelText(/email/i), "cadet@example.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));
    expect(await screen.findByText(/couldn't send the reset email/i)).toBeInTheDocument();
    expect(screen.queryByText(/check your email/i)).not.toBeInTheDocument();
  });
});
