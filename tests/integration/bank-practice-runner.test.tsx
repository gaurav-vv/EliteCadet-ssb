// Integration: BankPracticeRunner — the self-paced practice loop a student
// uses — with the server action mocked: answer → saved to the account →
// restored from what the server returns on the next visit.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const save = vi.hoisted(() => vi.fn());
vi.mock("@/lib/actions/practice", () => ({ saveAnswerAction: save }));

import { BankPracticeRunner } from "@/components/practice/bank-practice-runner";
import type { SavedPracticeAnswer } from "@/types/practice";
import type { McqItem } from "@/types/ssb-journey";

const MCQ: McqItem[] = [
  { id: "q1", prompt: "Soldier is to Army as Sailor is to ____", options: [{ id: "q1-a", label: "Navy" }, { id: "q1-b", label: "Police" }], correctOptionId: "q1-a" },
  { id: "q2", prompt: "2, 4, 8, ?", options: [{ id: "q2-a", label: "12" }, { id: "q2-b", label: "16" }], correctOptionId: "q2-b" },
];
const RESPONSES = [
  { id: "r1", prompt: "Why do you want to join the Armed Forces?" },
  { id: "r2", prompt: "Describe a time you showed leadership." },
];
const base = { backHref: "/student/practice/day-1", backLabel: "Day 1", initialAnswers: {} as Record<string, SavedPracticeAnswer> };
const saved = (over: Partial<SavedPracticeAnswer>): SavedPracticeAnswer => ({ text: "", optionId: null, selfReview: [], done: false, updatedAt: "2026-10-08T00:00:00Z", ...over });

beforeEach(() => {
  save.mockReset();
  save.mockResolvedValue({ ok: true, data: { updatedAt: "now" } });
});

describe("BankPracticeRunner (MCQ)", () => {
  it("disables Check answer until an option is picked", async () => {
    render(<BankPracticeRunner {...base} slug="oir-verbal-practice" mcqItems={MCQ} />);
    expect(screen.getByRole("button", { name: "Check answer" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Navy" }));
    expect(screen.getByRole("button", { name: "Check answer" })).toBeEnabled();
  });

  it("confirms a correct answer in text and saves the choice as done", async () => {
    render(<BankPracticeRunner {...base} slug="oir-verbal-practice" mcqItems={MCQ} />);
    await userEvent.click(screen.getByRole("button", { name: "Navy" }));
    await userEvent.click(screen.getByRole("button", { name: "Check answer" }));
    expect(screen.getByText("Correct.")).toBeInTheDocument();
    expect(screen.getByText("1 of 2 done")).toBeInTheDocument();
    expect(save).toHaveBeenCalledWith("oir-verbal-practice", "q1", { optionId: "q1-a", done: true });
  });

  it("explains a wrong answer in text, not colour alone", async () => {
    render(<BankPracticeRunner {...base} slug="oir-verbal-practice" mcqItems={MCQ} />);
    await userEvent.click(screen.getByRole("button", { name: "Police" }));
    await userEvent.click(screen.getByRole("button", { name: "Check answer" }));
    expect(screen.getByText(/not quite/i)).toBeInTheDocument();
  });

  it("moves between items with Next and Previous", async () => {
    render(<BankPracticeRunner {...base} slug="oir-verbal-practice" mcqItems={MCQ} />);
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Item 2 of 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });
});

describe("BankPracticeRunner (free-text)", () => {
  it("saves typed text after a pause, and Mark done straight away", async () => {
    render(<BankPracticeRunner {...base} slug="interview" responseItems={RESPONSES} />);
    await userEvent.type(screen.getByRole("textbox", { name: "Your answer" }), "To serve.");
    await waitFor(() => expect(save).toHaveBeenCalledWith("interview", "r1", { text: "To serve." }), { timeout: 3000 });
    await userEvent.click(screen.getByRole("button", { name: "Mark done" }));
    expect(screen.getByText("Marked done.")).toBeInTheDocument();
    await waitFor(() => expect(save).toHaveBeenLastCalledWith("interview", "r1", { done: true }));
    expect(await screen.findByText("Saved to your account.")).toBeInTheDocument();
  });

  it("saves a typed answer when moving to another question, and keeps it on screen", async () => {
    render(<BankPracticeRunner {...base} slug="interview" responseItems={RESPONSES} />);
    await userEvent.type(screen.getByRole("textbox", { name: "Your answer" }), "To serve the nation.");
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(save).toHaveBeenCalledWith("interview", "r1", { text: "To serve the nation." });
    expect(screen.getByRole("textbox", { name: "Your answer" })).toHaveValue("");
    await userEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByRole("textbox", { name: "Your answer" })).toHaveValue("To serve the nation.");
  });

  it("restores saved answers, ticks and done from the account on the next visit", () => {
    render(
      <BankPracticeRunner
        {...base}
        slug="interview"
        responseItems={RESPONSES}
        selfReview={["Specific example", "Honest"]}
        initialAnswers={{ r1: saved({ text: "Draft answer", selfReview: ["Honest"], done: true }) }}
      />,
    );
    expect(screen.getByDisplayValue("Draft answer")).toBeInTheDocument();
    expect(screen.getByText("1 of 2 done")).toBeInTheDocument();
    expect(screen.getByText("Marked done.")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Honest" })).toBeChecked();
  });

  it("a failed save keeps the text and offers a retry (never loses input)", async () => {
    // Offline until the student presses Retry.
    save.mockResolvedValue({ ok: false, error: { code: "network_error", message: "We couldn't save that. Please try again." } });
    render(<BankPracticeRunner {...base} slug="interview" responseItems={RESPONSES} />);
    await userEvent.type(screen.getByRole("textbox", { name: "Your answer" }), "Keep me");
    await userEvent.click(screen.getByRole("button", { name: "Mark done" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't save that");
    expect(screen.getByRole("textbox", { name: "Your answer" })).toHaveValue("Keep me");
    save.mockResolvedValue({ ok: true, data: { updatedAt: "now" } });
    await userEvent.click(screen.getByRole("button", { name: "Retry save" }));
    await waitFor(() => expect(save).toHaveBeenLastCalledWith("interview", "r1", { text: "Keep me", done: true }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a question's guidance and saves self-review ticks", async () => {
    const guided = [{ id: "g1", prompt: "Why the forces?", guidance: { assesses: "Genuine motivation.", tips: ["Give a personal reason."] } }, { id: "g2", prompt: "Your hobbies?" }];
    render(<BankPracticeRunner {...base} slug="interview" responseItems={guided} selfReview={["Specific example", "Honest"]} />);
    expect(screen.getByText("What assessors look for")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("checkbox", { name: "Specific example" }));
    expect(screen.getByText("Self-review (1 of 2)")).toBeInTheDocument();
    await waitFor(() => expect(save).toHaveBeenCalledWith("interview", "g1", { selfReview: ["Specific example"] }));
  });

  it("can save somewhere else (the PIQ page keeps answers on the device)", async () => {
    const onSave = vi.fn().mockResolvedValue({ ok: true });
    render(<BankPracticeRunner {...base} slug="interview" responseItems={RESPONSES} onSave={onSave} saveNote="Saved on this device." />);
    await userEvent.click(screen.getByRole("button", { name: "Mark done" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith("r1", { done: true }));
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByText("Saved on this device.")).toBeInTheDocument();
  });

  it("renders nothing when a module has no items", () => {
    const { container } = render(<BankPracticeRunner {...base} slug="interview" responseItems={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
