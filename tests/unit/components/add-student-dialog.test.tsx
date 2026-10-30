import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddStudentDialog } from "@/components/academy/students/add-student-dialog";
import { addAcademyStudentAction } from "@/lib/actions/academy-people";

vi.mock("@/lib/actions/academy-people", () => ({ addAcademyStudentAction: vi.fn() }));
vi.mock("@/lib/supabase/env", () => ({ localMailboxUrl: () => null }));
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));

const action = vi.mocked(addAcademyStudentAction);

beforeEach(() => {
  action.mockReset();
  refresh.mockReset();
});

async function openDialog() {
  const user = userEvent.setup();
  render(<AddStudentDialog />);
  await user.click(screen.getByRole("button", { name: /^add student$/i }));
  return user;
}
const dialogSubmit = () => screen.getAllByRole("button", { name: /^add student$/i }).at(-1)!;

describe("AddStudentDialog: success", () => {
  it("shows 'Student added successfully!', closes, refreshes the list and clears the form", async () => {
    action.mockResolvedValue({ ok: true, data: { id: "1", name: "Asha Rao", invited: false } } as never);
    const user = await openDialog();
    await user.type(screen.getByLabelText(/^email/i), "asha@x.co");
    await user.click(dialogSubmit());
    expect(await screen.findByText(/Student added successfully!/)).toBeInTheDocument();
    expect(screen.getByText(/Asha Rao joined your academy/)).toBeInTheDocument();
    expect(action).toHaveBeenCalledWith({ email: "asha@x.co", fullName: "" });
    expect(refresh).toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    // Reopening shows an empty form: it was reset only because the add worked.
    await user.click(screen.getAllByRole("button", { name: /^add student$/i })[0]);
    expect(screen.getByLabelText(/^email/i)).toHaveValue("");
  });

  it("says an invitation email was sent when the person had no account", async () => {
    action.mockResolvedValue({ ok: true, data: { id: "1", name: "New Person", invited: true } } as never);
    const user = await openDialog();
    await user.type(screen.getByLabelText(/^email/i), "new@x.co");
    await user.type(screen.getByLabelText(/full name/i), "New Person");
    await user.click(dialogSubmit());
    expect(await screen.findByText(/Student added successfully! An invitation email was sent to New Person/)).toBeInTheDocument();
  });
});

describe("AddStudentDialog: failures keep what the user typed", () => {
  it("shows a field error next to the email and keeps the dialog and the values", async () => {
    action.mockResolvedValue({ ok: false, field: "email", error: { code: "validation_error", message: "That student already belongs to another academy." } } as never);
    const user = await openDialog();
    await user.type(screen.getByLabelText(/^email/i), "theirs@x.co");
    await user.type(screen.getByLabelText(/full name/i), "Their Student");
    await user.click(dialogSubmit());
    expect(await screen.findByText(/another academy/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email/i)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(/^email/i)).toHaveValue("theirs@x.co");
    expect(screen.getByLabelText(/full name/i)).toHaveValue("Their Student");
    expect(screen.queryByText(/Student added successfully/)).not.toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("shows a form-level error for a server failure, without internals, and keeps the values", async () => {
    action.mockResolvedValue({ ok: false, error: { code: "server_error", message: "We couldn't add the student. Please try again." } } as never);
    const user = await openDialog();
    await user.type(screen.getByLabelText(/^email/i), "asha@x.co");
    await user.click(dialogSubmit());
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't add the student. Please try again.");
    expect(screen.getByLabelText(/^email/i)).toHaveValue("asha@x.co");
    expect(screen.queryByText(/Student added successfully/)).not.toBeInTheDocument();
  });

  it("explains a lost connection and keeps the values", async () => {
    action.mockRejectedValue(new Error("network"));
    const user = await openDialog();
    await user.type(screen.getByLabelText(/^email/i), "asha@x.co");
    await user.click(dialogSubmit());
    expect(await screen.findByText(/couldn't reach the server/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email/i)).toHaveValue("asha@x.co");
    expect(screen.getByRole("button", { name: /^add student$/i, hidden: false })).toBeInTheDocument();
  });
});

describe("AddStudentDialog: validation before sending", () => {
  it("marks the email as required and cannot be submitted empty", async () => {
    await openDialog();
    expect(screen.getByLabelText(/^email/i)).toBeRequired();
    expect(dialogSubmit()).toBeDisabled();
  });

  it("rejects an invalid email with a field message, without calling the server", async () => {
    const user = await openDialog();
    await user.type(screen.getByLabelText(/^email/i), "not-an-email");
    await user.click(dialogSubmit());
    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(action).not.toHaveBeenCalled();
  });

  it("rejects a one-letter name when a name is given", async () => {
    const user = await openDialog();
    await user.type(screen.getByLabelText(/^email/i), "a@x.co");
    await user.type(screen.getByLabelText(/full name/i), "A");
    await user.click(dialogSubmit());
    expect(await screen.findByText(/2.80 characters/)).toBeInTheDocument();
    expect(action).not.toHaveBeenCalled();
  });
});

describe("AddStudentDialog: duplicate submissions", () => {
  it("adds the student once when the button is pressed twice quickly", async () => {
    let release!: (v: unknown) => void;
    action.mockImplementation((() => new Promise((r) => (release = r))) as never);
    const user = await openDialog();
    await user.type(screen.getByLabelText(/^email/i), "asha@x.co");
    await user.dblClick(dialogSubmit());
    await waitFor(() => expect(action).toHaveBeenCalled());
    expect(action).toHaveBeenCalledTimes(1);
    release({ ok: true, data: { id: "1", name: "Asha", invited: false } });
    expect(await screen.findByText(/Student added successfully!/)).toBeInTheDocument();
    expect(action).toHaveBeenCalledTimes(1);
  });
});
