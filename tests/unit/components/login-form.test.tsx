import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "@/components/auth/login-form";
import { logIn } from "@/lib/api/auth";

vi.mock("@/lib/api/auth", () => ({
  logIn: vi.fn(),
}));

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

const mockedLogIn = vi.mocked(logIn);

beforeEach(() => {
  mockedLogIn.mockReset();
  push.mockReset();
  refresh.mockReset();
});

describe("LoginForm", () => {
  it("shows the reason banner for an expired/invalid link", () => {
    render(<LoginForm reason="link_invalid" />);
    expect(screen.getByText(/link is invalid or has expired/i)).toBeInTheDocument();
  });

  it("submits the entered credentials and redirects to the role's dashboard on success", async () => {
    mockedLogIn.mockResolvedValue({ ok: true, data: { role: "mentor" } });
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), "cadet@example.com");
    await user.type(screen.getByLabelText(/password/i), "correcthorse");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => expect(mockedLogIn).toHaveBeenCalledWith({ email: "cadet@example.com", password: "correcthorse" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/mentor"));
    expect(refresh).toHaveBeenCalled();
  });

  it("honors an explicit redirectTo instead of the role default", async () => {
    mockedLogIn.mockResolvedValue({ ok: true, data: { role: "student" } });
    const user = userEvent.setup();
    render(<LoginForm redirectTo="/student/practice" />);

    await user.type(screen.getByLabelText(/email/i), "cadet@example.com");
    await user.type(screen.getByLabelText(/password/i), "correcthorse");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/student/practice"));
  });

  it("displays the server's error message and does not navigate on failed login", async () => {
    mockedLogIn.mockResolvedValue({ ok: false, error: { code: "invalid_credentials", message: "Incorrect email or password." } });
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), "cadet@example.com");
    await user.type(screen.getByLabelText(/password/i), "wrongpassword");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    expect(await screen.findByText("Incorrect email or password.")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("never rejects an unauthenticated user's typed credentials on a network failure", async () => {
    mockedLogIn.mockResolvedValue({ ok: false, error: { code: "network_error", message: "Network error. Check your connection and try again." } });
    const user = userEvent.setup();
    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    await user.type(emailInput, "cadet@example.com");
    await user.type(screen.getByLabelText(/password/i), "correcthorse");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    await screen.findByText(/network error/i);
    // The student's typed input must survive the failure (AGENTS.md §11).
    expect(emailInput.value).toBe("cadet@example.com");
  });
});
