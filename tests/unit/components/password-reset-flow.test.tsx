import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ForgotPasswordForm, RESET_SENT_TOAST } from "@/components/auth/forgot-password-form";
import { ResetPasswordForm, PASSWORD_UPDATED_MESSAGE } from "@/components/auth/reset-password-form";
import { LoginForm } from "@/components/auth/login-form";
import { FlashToast } from "@/components/shared/flash-toast";
import { establishRecoverySession, logIn, pendingInviteEmail, requestPasswordReset, updatePassword } from "@/lib/api/auth";
import { takeFlash, setFlash } from "@/lib/flash";

vi.mock("@/lib/api/auth", () => ({ requestPasswordReset: vi.fn(), establishRecoverySession: vi.fn(), updatePassword: vi.fn(), logIn: vi.fn(), pendingInviteEmail: vi.fn() }));
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

const request = vi.mocked(requestPasswordReset);
const establish = vi.mocked(establishRecoverySession);
const update = vi.mocked(updatePassword);
const signIn = vi.mocked(logIn);
const invitee = vi.mocked(pendingInviteEmail);

beforeEach(() => {
  request.mockReset();
  establish.mockReset();
  update.mockReset();
  signIn.mockReset();
  invitee.mockReset();
  invitee.mockResolvedValue(null);
  push.mockReset();
  sessionStorage.clear();
});

describe("Forgot password", () => {
  const submit = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole("button", { name: /send reset link/i }));

  it("sends the link for a valid email, then shows a success popup and the check-your-email card", async () => {
    request.mockResolvedValue({ ok: true, data: null });
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);
    await user.type(screen.getByLabelText("Email"), "  cadet@example.com ");
    await submit(user);
    expect(request).toHaveBeenCalledWith("cadet@example.com");
    expect(await screen.findByText("Check your email")).toBeInTheDocument();
    expect(await screen.findByRole("status")).toHaveTextContent(RESET_SENT_TOAST);
  });

  it("never says whether the address has an account", async () => {
    request.mockResolvedValue({ ok: true, data: null });
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);
    await user.type(screen.getByLabelText("Email"), "someone@example.com");
    await submit(user);
    await screen.findByText("Check your email");
    expect(screen.getByText(/if an account exists/i)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/if that email is registered/i);
    expect(screen.queryByText(/no account|not registered|doesn't exist/i)).not.toBeInTheDocument();
  });

  it.each([
    ["an empty email", "", "Email is required."],
    ["a badly formatted email", "not-an-email", "Enter a valid email address."],
  ])("rejects %s next to the field and sends nothing", async (_n, value, message) => {
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);
    if (value) await user.type(screen.getByLabelText("Email"), value);
    await submit(user);
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Email")).toHaveFocus();
    expect(request).not.toHaveBeenCalled();
  });

  it("shows the failure, no popup, and keeps the typed email when sending fails", async () => {
    request.mockResolvedValue({ ok: false, error: { code: "unknown_error", message: "We couldn't send the reset email right now. Please try again shortly." } });
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);
    await user.type(screen.getByLabelText("Email"), "cadet@example.com");
    await submit(user);
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't send the reset email/i);
    expect(screen.queryByText("Check your email")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveValue("cadet@example.com");
  });

  it("shows the rate-limit message", async () => {
    request.mockResolvedValue({ ok: false, error: { code: "rate_limited", message: "Too many reset requests. Please wait a few minutes and try again." } });
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);
    await user.type(screen.getByLabelText("Email"), "cadet@example.com");
    await submit(user);
    expect(await screen.findByRole("alert")).toHaveTextContent(/too many reset requests/i);
  });

  it("sends one email when the button is pressed twice, and disables it while sending", async () => {
    let release!: (v: unknown) => void;
    request.mockImplementation((() => new Promise((r) => (release = r))) as never);
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);
    await user.type(screen.getByLabelText("Email"), "cadet@example.com");
    await user.dblClick(screen.getByRole("button", { name: /send reset link/i }));
    expect(await screen.findByRole("button", { name: /sending/i })).toBeDisabled();
    expect(request).toHaveBeenCalledTimes(1);
    release({ ok: true, data: null });
    await screen.findByText("Check your email");
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("explains a link that was invalid, expired or already used", () => {
    render(<ForgotPasswordForm reason="link_invalid" />);
    expect(screen.getByText(/invalid, expired or already used/i)).toBeInTheDocument();
  });
});

describe("Reset password: the link and the session", () => {
  it.each([
    ["an expired or already-used link", () => establish.mockResolvedValue("invalid")],
    ["an invalid recovery token", () => establish.mockResolvedValue("invalid")],
    ["opening the page directly with no recovery session", () => establish.mockResolvedValue("invalid")],
    ["a check that fails outright", () => establish.mockRejectedValue(new Error("network"))],
  ])("shows no password form for %s, only a way to ask for a new link", async (_n, arrange) => {
    arrange();
    render(<ResetPasswordForm />);
    expect(await screen.findByText(/expired or was already used/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /request a new link/i })).toHaveAttribute("href", "/forgot-password");
    expect(screen.getByRole("link", { name: /back to login/i })).toHaveAttribute("href", "/login");
    expect(screen.queryByLabelText(/new password/i)).not.toBeInTheDocument();
    expect(update).not.toHaveBeenCalled(); // an unauthenticated update can never be attempted
  });

  it("explains that opening the page without a link has nothing to reset", async () => {
    establish.mockResolvedValue("invalid");
    render(<ResetPasswordForm />);
    expect(await screen.findByText(/opened this page without a link/i)).toBeInTheDocument();
  });

  it("shows only 'checking' (no form) until the recovery session is confirmed", () => {
    establish.mockReturnValue(new Promise(() => {}));
    render(<ResetPasswordForm />);
    expect(screen.getByText(/checking your reset link/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/new password/i)).not.toBeInTheDocument();
  });

  it("shows the form again after a refresh, because the recovery session is still there", async () => {
    establish.mockResolvedValue("ready");
    const first = render(<ResetPasswordForm />);
    expect(await screen.findByLabelText(/new password/i)).toBeInTheDocument();
    first.unmount();
    render(<ResetPasswordForm />);
    expect(await screen.findByLabelText(/new password/i)).toBeInTheDocument();
    expect(establish).toHaveBeenCalledTimes(2);
  });
});

describe("Reset password: the form", () => {
  async function ready() {
    establish.mockResolvedValue("ready");
    const user = userEvent.setup();
    render(<ResetPasswordForm />);
    await screen.findByLabelText(/new password/i);
    return user;
  }
  const fill = async (user: ReturnType<typeof userEvent.setup>, password: string, confirm: string) => {
    if (password) await user.type(screen.getByLabelText(/new password/i), password);
    if (confirm) await user.type(screen.getByLabelText(/confirm password/i), confirm);
  };
  const save = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole("button", { name: /save new password/i }));

  it("has both fields marked required, and explains the password rule", async () => {
    await ready();
    expect(screen.getByLabelText(/new password/i)).toBeRequired();
    expect(screen.getByLabelText(/confirm password/i)).toBeRequired();
    expect(screen.getByText("At least 6 characters.")).toBeInTheDocument();
  });

  it("flags empty fields next to each field, focuses the first, and sends nothing", async () => {
    const user = await ready();
    await save(user);
    expect(await screen.findByText("Password is required.")).toBeInTheDocument();
    expect(screen.getByText("Confirm your new password.")).toBeInTheDocument();
    expect(screen.getByLabelText(/new password/i)).toHaveFocus();
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects a weak password before sending, and keeps what was typed", async () => {
    const user = await ready();
    await fill(user, "short", "short");
    await save(user);
    expect(await screen.findByText("Password must be at least 6 characters.")).toBeInTheDocument();
    expect(screen.getByLabelText(/new password/i)).toHaveValue("short");
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects a password mismatch next to the confirmation field and sends nothing", async () => {
    const user = await ready();
    await fill(user, "correcthorse", "correcthorsE");
    await save(user);
    expect(await screen.findByText("The passwords don't match.")).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(/new password/i)).toHaveValue("correcthorse");
    expect(update).not.toHaveBeenCalled();
  });

  it("explains a password the server refuses as too weak, next to the password field", async () => {
    update.mockResolvedValue({ ok: false, error: { code: "weak_password", message: "Choose a stronger password." } });
    const user = await ready();
    await fill(user, "password1234", "password1234");
    await save(user);
    expect(await screen.findByText(/choose a stronger password\. use at least 6 characters/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/new password/i)).toHaveAttribute("aria-invalid", "true");
    expect(push).not.toHaveBeenCalled();
  });

  it("asks for a different password when it is the same as the current one", async () => {
    update.mockResolvedValue({ ok: false, error: { code: "same_password", message: "Choose a password different from your current one." } });
    const user = await ready();
    await fill(user, "correcthorse", "correcthorse");
    await save(user);
    expect(await screen.findByText("Choose a password different from your current one.")).toBeInTheDocument();
  });

  it("goes back to the expired-link state if the recovery session lapsed before saving", async () => {
    update.mockResolvedValue({ ok: false, error: { code: "link_expired", message: "expired" } });
    const user = await ready();
    await fill(user, "correcthorse", "correcthorse");
    await save(user);
    expect(await screen.findByText(/expired or was already used/i)).toBeInTheDocument();
    expect(takeFlash()).toBeNull();
  });

  it("shows a network failure as a message and keeps the form", async () => {
    update.mockResolvedValue({ ok: false, error: { code: "network_error", message: "Network error. Check your connection and try again." } });
    const user = await ready();
    await fill(user, "correcthorse", "correcthorse");
    await save(user);
    expect(await screen.findByRole("alert")).toHaveTextContent(/network error/i);
    expect(screen.getByLabelText(/new password/i)).toHaveValue("correcthorse");
    expect(push).not.toHaveBeenCalled();
  });

  it("shows and hides both passwords with a keyboard-reachable toggle", async () => {
    const user = await ready();
    const toggles = screen.getAllByRole("button", { name: /show password/i });
    expect(toggles).toHaveLength(2);
    expect(screen.getByLabelText(/new password/i)).toHaveAttribute("type", "password");
    await user.click(toggles[0]);
    expect(screen.getByLabelText(/new password/i)).toHaveAttribute("type", "text");
    expect(screen.getByLabelText(/confirm password/i)).toHaveAttribute("type", "password"); // independent
    expect(screen.getByRole("button", { name: /hide password/i })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: /hide password/i }));
    expect(screen.getByLabelText(/new password/i)).toHaveAttribute("type", "password");
  });

  it("updates the password once, leaves the success message for the login page, and goes there", async () => {
    update.mockResolvedValue({ ok: true, data: null });
    const user = await ready();
    await fill(user, "correcthorse", "correcthorse");
    await save(user);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/login?reason=password_updated"));
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith("correcthorse");
    expect(takeFlash()).toBe("Your password has been updated successfully.");
    expect(PASSWORD_UPDATED_MESSAGE).toBe("Your password has been updated successfully.");
  });

  it("signs an invited mentor straight in to their dashboard after the first password", async () => {
    update.mockResolvedValue({ ok: true, data: null });
    invitee.mockResolvedValue("mentor@example.com");
    signIn.mockResolvedValue({ ok: true, data: { role: "mentor" } });
    const user = await ready();
    await fill(user, "correcthorse", "correcthorse");
    await save(user);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/mentor"));
    expect(signIn).toHaveBeenCalledWith({ email: "mentor@example.com", password: "correcthorse" });
  });

  it("falls back to the login page if signing the invited person in fails", async () => {
    update.mockResolvedValue({ ok: true, data: null });
    invitee.mockResolvedValue("mentor@example.com");
    signIn.mockResolvedValue({ ok: false, error: { code: "unknown_error", message: "x" } });
    const user = await ready();
    await fill(user, "correcthorse", "correcthorse");
    await save(user);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/login?reason=password_updated"));
  });

  it("does not sign anyone in after an ordinary password reset", async () => {
    update.mockResolvedValue({ ok: true, data: null });
    const user = await ready();
    await fill(user, "correcthorse", "correcthorse");
    await save(user);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/login?reason=password_updated"));
    expect(signIn).not.toHaveBeenCalled();
  });

  it("shows no success message while the update is still running or when it fails", async () => {
    let release!: (v: unknown) => void;
    update.mockImplementation((() => new Promise((r) => (release = r))) as never);
    const user = await ready();
    await fill(user, "correcthorse", "correcthorse");
    await save(user);
    expect(await screen.findByRole("button", { name: /saving/i })).toBeDisabled();
    expect(takeFlash()).toBeNull();
    expect(push).not.toHaveBeenCalled();
    release({ ok: false, error: { code: "unknown_error", message: "We couldn't update your password. Please try again." } });
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't update your password/i);
    expect(takeFlash()).toBeNull();
  });

  it("submits once when the button is pressed twice", async () => {
    let release!: (v: unknown) => void;
    update.mockImplementation((() => new Promise((r) => (release = r))) as never);
    const user = await ready();
    await fill(user, "correcthorse", "correcthorse");
    await user.dblClick(screen.getByRole("button", { name: /save new password/i }));
    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update).toHaveBeenCalledTimes(1);
    release({ ok: true, data: null });
    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(update).toHaveBeenCalledTimes(1);
  });
});

describe("After the password changes: the login page", () => {
  it("shows the success popup left by the reset page, once", async () => {
    setFlash(PASSWORD_UPDATED_MESSAGE);
    const { unmount } = render(<FlashToast />);
    expect(await screen.findByRole("status")).toHaveTextContent("Your password has been updated successfully.");
    unmount();
    render(<FlashToast />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("also shows it as a notice above the login form", () => {
    render(<LoginForm reason="password_updated" />);
    expect(screen.getByText(/your password has been updated successfully/i)).toBeInTheDocument();
  });
});
