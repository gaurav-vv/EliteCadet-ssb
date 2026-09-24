// Integration: PIQ form → generated questions → practice runner, wired to the
// real PIQ and answer stores (specs.md §6.4b).
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PiqInterview } from "@/components/practice/piq-interview";

beforeEach(() => {
  window.localStorage.clear();
});

describe("PiqInterview", () => {
  it("shows a validation error instead of questions for an empty PIQ", async () => {
    render(<PiqInterview selfReview={[]} />);
    await userEvent.click(await screen.findByRole("button", { name: "Get my questions" }));
    expect(screen.getByText(/at least one field/i)).toBeInTheDocument();
    expect(screen.queryByText(/questions built from your PIQ/i)).not.toBeInTheDocument();
  });

  it("builds questions from what the student typed, and keeps the PIQ after a reload", async () => {
    const { unmount } = render(<PiqInterview selfReview={["Specific example"]} />);
    await userEvent.type(await screen.findByLabelText("Sports or games you play"), "Kabaddi");
    await userEvent.click(screen.getByRole("button", { name: "Get my questions" }));

    expect(screen.getByText("2 questions built from your PIQ.")).toBeInTheDocument();
    expect(screen.getByText(/You play Kabaddi\./)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Specific example" })).toBeInTheDocument();
    unmount();

    render(<PiqInterview selfReview={[]} />);
    expect(await screen.findByText(/You play Kabaddi\./)).toBeInTheDocument();
  });

  it("lets the student edit the PIQ and regenerates the questions", async () => {
    render(<PiqInterview selfReview={[]} />);
    await userEvent.type(await screen.findByLabelText("Hobbies"), "Chess");
    await userEvent.click(screen.getByRole("button", { name: "Get my questions" }));
    expect(screen.getByText(/You listed Chess\./)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Edit PIQ" }));
    const hobbies = screen.getByLabelText("Hobbies");
    await userEvent.clear(hobbies);
    await userEvent.type(hobbies, "Painting");
    await userEvent.click(screen.getByRole("button", { name: "Get my questions" }));
    expect(screen.getByText(/You listed Painting\./)).toBeInTheDocument();
  });

  it("cancelling an edit keeps the saved PIQ", async () => {
    render(<PiqInterview selfReview={[]} />);
    await userEvent.type(await screen.findByLabelText("Hobbies"), "Chess");
    await userEvent.click(screen.getByRole("button", { name: "Get my questions" }));
    await userEvent.click(screen.getByRole("button", { name: "Edit PIQ" }));
    await userEvent.clear(screen.getByLabelText("Hobbies"));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText(/You listed Chess\./)).toBeInTheDocument();
  });
});
