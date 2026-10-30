import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignupForm, SIGNUP_SUCCESS_MESSAGE } from "@/components/auth/signup-form";
import { LoginForm } from "@/components/auth/login-form";
import { FlashToast } from "@/components/shared/flash-toast";
import { logIn, signUp } from "@/lib/api/auth";
import { setFlash, takeFlash } from "@/lib/flash";

vi.mock("@/lib/api/auth", () => ({ signUp: vi.fn(), logIn: vi.fn() }));
const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));

beforeEach(() => {
  vi.mocked(signUp).mockReset();
  vi.mocked(logIn).mockReset();
  push.mockReset();
  refresh.mockReset();
  sessionStorage.clear();
});

async function fillSignup(user: ReturnType<typeof userEvent.setup>, over: { name?: string; email?: string; password?: string } = {}) {
  await user.type(screen.getByLabelText(/full name/i), over.name ?? "New Cadet");
  await user.type(screen.getByLabelText(/^email/i), over.email ?? "new@example.com");
  await user.type(screen.getByLabelText(/^password/i), over.password ?? "correcthorse");
}
const create = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole("button", { name: /create account/i }));

describe("SignupForm: required fields and field-specific errors", () => {
  it("flags every empty required field next to its input, focuses the first, and sends nothing", async () => {
    const user = userEvent.setup();
    render(<SignupForm />);
    await create(user);
    expect(await screen.findByText("Name is required.")).toBeInTheDocument();
    expect(screen.getByText("Email is required.")).toBeInTheDocument();
    expect(screen.getByText("Password is required.")).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toHaveFocus();
    expect(screen.getByLabelText(/full name/i)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(/^email/i)).toHaveAttribute("aria-describedby", expect.stringContaining("email-error"));
    expect(signUp).not.toHaveBeenCalled();
  });

  it("identifies required fields and explains the password rule", () => {
    render(<SignupForm />);
    expect(screen.getByText(/fields marked \* are required/i)).toBeInTheDocument();
    for (const field of [/full name/i, /^email/i, /^password/i]) expect(screen.getByLabelText(field)).toBeRequired();
    expect(screen.getByText("At least 8 characters.")).toBeInTheDocument();
  });

  it("rejects an invalid email and a short password, and keeps everything typed", async () => {
    const user = userEvent.setup();
    render(<SignupForm />);
    await fillSignup(user, { email: "not-an-email", password: "short" });
    await create(user);
    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(screen.getByText("Password must be at least 8 characters.")).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toHaveValue("New Cadet");
    expect(screen.getByLabelText(/^email/i)).toHaveValue("not-an-email");
    expect(signUp).not.toHaveBeenCalled();
  });

  it("requires an academy name for an academy account", async () => {
    const user = userEvent.setup();
    render(<SignupForm initialRole="academy_admin" />);
    await fillSignup(user);
    await create(user);
    expect(await screen.findByText("Academy name is required.")).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });

  it("clears a field's error once the user fixes that field", async () => {
    const user = userEvent.setup();
    render(<SignupForm />);
    await create(user);
    await screen.findByText("Email is required.");
    await user.type(screen.getByLabelText(/^email/i), "a");
    expect(screen.queryByText("Email is required.")).not.toBeInTheDocument();
  });
});

describe("SignupForm: success is shown only after the backend confirms", () => {
  it("leaves a success message for the next screen and goes on after a real account exists", async () => {
    vi.mocked(signUp).mockResolvedValue({ ok: true, data: { role: "student", needsConfirmation: false } });
    const user = userEvent.setup();
    render(<SignupForm />);
    await fillSignup(user);
    await create(user);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/onboarding"));
    expect(takeFlash()).toBe(SIGNUP_SUCCESS_MESSAGE);
    expect(SIGNUP_SUCCESS_MESSAGE).toBe("Your account has been created successfully!");
  });

  it("shows no success while the request is still running, and disables the button", async () => {
    let release!: (v: unknown) => void;
    vi.mocked(signUp).mockImplementation((() => new Promise((r) => (release = r))) as never);
    const user = userEvent.setup();
    render(<SignupForm />);
    await fillSignup(user);
    await create(user);
    expect(await screen.findByRole("button", { name: /creating account/i })).toBeDisabled();
    expect(screen.queryByText(SIGNUP_SUCCESS_MESSAGE)).not.toBeInTheDocument();
    expect(takeFlash()).toBeNull();
    release({ ok: true, data: { role: "student", needsConfirmation: false } });
    await waitFor(() => expect(push).toHaveBeenCalled());
  });

  it("tells the user the account was created and to confirm their email when confirmation is on", async () => {
    vi.mocked(signUp).mockResolvedValue({ ok: true, data: { role: "student", needsConfirmation: true } });
    const user = userEvent.setup();
    render(<SignupForm />);
    await fillSignup(user);
    await create(user);
    expect(await screen.findByText(SIGNUP_SUCCESS_MESSAGE)).toBeInTheDocument();
    expect(screen.getByText(/confirm your email/i)).toBeInTheDocument();
    expect(screen.getByText(/new@example\.com/)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("creates the account once when the button is pressed twice", async () => {
    let release!: (v: unknown) => void;
    vi.mocked(signUp).mockImplementation((() => new Promise((r) => (release = r))) as never);
    const user = userEvent.setup();
    render(<SignupForm />);
    await fillSignup(user);
    await user.dblClick(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() => expect(signUp).toHaveBeenCalled());
    expect(signUp).toHaveBeenCalledTimes(1);
    release({ ok: true, data: { role: "student", needsConfirmation: true } });
    await screen.findByText(SIGNUP_SUCCESS_MESSAGE);
    expect(signUp).toHaveBeenCalledTimes(1);
  });
});

describe("SignupForm: failures", () => {
  it("shows the useful error, no success message, and keeps what was typed", async () => {
    vi.mocked(signUp).mockResolvedValue({ ok: false, error: { code: "rate_limited", message: "Too many attempts. Please wait a few minutes and try again." } });
    const user = userEvent.setup();
    render(<SignupForm />);
    await fillSignup(user);
    await create(user);
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many attempts. Please wait a few minutes and try again.");
    expect(screen.queryByText(SIGNUP_SUCCESS_MESSAGE)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^email/i)).toHaveValue("new@example.com");
    expect(takeFlash()).toBeNull();
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /create account/i })).toBeEnabled();
  });

  it("puts an already-registered email next to the email field", async () => {
    vi.mocked(signUp).mockResolvedValue({ ok: false, error: { code: "email_in_use", message: "An account with this email already exists." } });
    const user = userEvent.setup();
    render(<SignupForm />);
    await fillSignup(user);
    await create(user);
    expect(await screen.findByText("An account with this email already exists.")).toBeInTheDocument();
    expect(screen.getByLabelText(/^email/i)).toHaveAttribute("aria-invalid", "true");
  });

  it("explains a password the server refused, next to the password field", async () => {
    vi.mocked(signUp).mockResolvedValue({ ok: false, error: { code: "weak_password", message: "Choose a stronger password." } });
    const user = userEvent.setup();
    render(<SignupForm />);
    await fillSignup(user);
    await create(user);
    expect(await screen.findByText(/Choose a stronger password\. Use at least 8 characters/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toHaveAttribute("aria-invalid", "true");
  });

  it("never shows raw database or stack details", async () => {
    vi.mocked(signUp).mockResolvedValue({ ok: false, error: { code: "unknown_error", message: "We couldn't create your account. Please try again." } });
    const user = userEvent.setup();
    render(<SignupForm />);
    await fillSignup(user);
    await create(user);
    const text = (await screen.findByRole("alert")).textContent ?? "";
    expect(text).toBe("We couldn't create your account. Please try again.");
    expect(text).not.toMatch(/database|stack|trigger|sql|relation/i);
  });
});

describe("LoginForm: required fields and duplicate submissions", () => {
  it("flags empty fields next to their inputs and sends nothing", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    expect(screen.getByText(/both required/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^log in$/i }));
    expect(await screen.findByText("Email is required.")).toBeInTheDocument();
    expect(screen.getByText("Password is required.")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveFocus();
    expect(logIn).not.toHaveBeenCalled();
  });

  it("rejects an invalid email with a field message and keeps the typed values", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByLabelText("Email"), "nope");
    await user.type(screen.getByLabelText("Password", { exact: true }), "secret123");
    await user.click(screen.getByRole("button", { name: /^log in$/i }));
    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveValue("nope");
    expect(logIn).not.toHaveBeenCalled();
  });

  it("logs in once when the button is pressed twice", async () => {
    let release!: (v: unknown) => void;
    vi.mocked(logIn).mockImplementation((() => new Promise((r) => (release = r))) as never);
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByLabelText("Email"), "a@x.co");
    await user.type(screen.getByLabelText("Password", { exact: true }), "secret123");
    await user.dblClick(screen.getByRole("button", { name: /^log in$/i }));
    await waitFor(() => expect(logIn).toHaveBeenCalled());
    expect(logIn).toHaveBeenCalledTimes(1);
    release({ ok: true, data: { role: "student" } });
    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(logIn).toHaveBeenCalledTimes(1);
  });
});

describe("FlashToast", () => {
  it("shows a message left by the previous screen, once", async () => {
    setFlash("Your account has been created successfully!");
    const { unmount } = render(<FlashToast />);
    expect(await screen.findByRole("status")).toHaveTextContent("Your account has been created successfully!");
    unmount();
    render(<FlashToast />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows nothing, and does not fail, when there is no message or storage is blocked", () => {
    render(<FlashToast />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => render(<FlashToast />)).not.toThrow();
    spy.mockRestore();
  });
});
