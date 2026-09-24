// Integration: BankPracticeRunner wired to the real localStorage progress
// store (lib/student/ssb-journey-progress.ts) — the practice loop a student
// actually uses: answer → mark done → progress persists across a remount.
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BankPracticeRunner } from "@/components/practice/bank-practice-runner";
import { isItemDone } from "@/lib/student/ssb-journey-progress";
import type { McqItem } from "@/types/ssb-journey";

const MCQ: McqItem[] = [
  {
    id: "q1",
    prompt: "Soldier is to Army as Sailor is to ____",
    options: [
      { id: "q1-a", label: "Navy" },
      { id: "q1-b", label: "Police" },
    ],
    correctOptionId: "q1-a",
  },
  {
    id: "q2",
    prompt: "2, 4, 8, ?",
    options: [
      { id: "q2-a", label: "12" },
      { id: "q2-b", label: "16" },
    ],
    correctOptionId: "q2-b",
  },
];

const RESPONSES = [
  { id: "r1", prompt: "Why do you want to join the Armed Forces?" },
  { id: "r2", prompt: "Describe a time you showed leadership." },
];

const baseProps = { dayId: "day-1", moduleId: "oir-practice", backHref: "/student/practice/day-1", backLabel: "Day 1" };

beforeEach(() => {
  window.localStorage.clear();
});

describe("BankPracticeRunner (MCQ)", () => {
  it("disables Check answer until an option is picked", async () => {
    render(<BankPracticeRunner {...baseProps} mcqItems={MCQ} />);
    expect(screen.getByRole("button", { name: "Check answer" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Navy" }));
    expect(screen.getByRole("button", { name: "Check answer" })).toBeEnabled();
  });

  it("confirms a correct answer in text and saves the item as done", async () => {
    render(<BankPracticeRunner {...baseProps} mcqItems={MCQ} />);
    await userEvent.click(screen.getByRole("button", { name: "Navy" }));
    await userEvent.click(screen.getByRole("button", { name: "Check answer" }));
    expect(screen.getByText("Correct.")).toBeInTheDocument();
    expect(screen.getByText("1 of 2 done")).toBeInTheDocument();
    expect(isItemDone("day-1", "oir-practice", "q1")).toBe(true);
  });

  it("explains a wrong answer in text, not colour alone", async () => {
    render(<BankPracticeRunner {...baseProps} mcqItems={MCQ} />);
    await userEvent.click(screen.getByRole("button", { name: "Police" }));
    await userEvent.click(screen.getByRole("button", { name: "Check answer" }));
    expect(screen.getByText(/not quite/i)).toBeInTheDocument();
  });

  it("moves between items with Next and Previous", async () => {
    render(<BankPracticeRunner {...baseProps} mcqItems={MCQ} />);
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Item 2 of 2")).toBeInTheDocument();
    expect(screen.getByText("2, 4, 8, ?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });
});

describe("BankPracticeRunner (free-text)", () => {
  it("marks a response done and keeps that after a remount", async () => {
    const props = { ...baseProps, moduleId: "personal-interview", responseItems: RESPONSES };
    const { unmount } = render(<BankPracticeRunner {...props} />);
    await userEvent.type(screen.getByPlaceholderText("Type your response…"), "To serve.");
    await userEvent.click(screen.getByRole("button", { name: "Mark done" }));
    expect(screen.getByText("Marked done.")).toBeInTheDocument();
    unmount();

    render(<BankPracticeRunner {...props} />);
    expect(await screen.findByText("1 of 2 done")).toBeInTheDocument();
    expect(screen.getByText("Marked done.")).toBeInTheDocument();
  });

  it("keeps a typed answer when moving to another question and back", async () => {
    render(<BankPracticeRunner {...baseProps} moduleId="personal-interview" responseItems={RESPONSES} />);
    await userEvent.type(screen.getByRole("textbox", { name: "Your answer" }), "To serve the nation.");
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("textbox", { name: "Your answer" })).toHaveValue("");
    await userEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByRole("textbox", { name: "Your answer" })).toHaveValue("To serve the nation.");
  });

  it("restores a typed answer after a reload (remount)", async () => {
    const props = { ...baseProps, moduleId: "personal-interview", responseItems: RESPONSES };
    const { unmount } = render(<BankPracticeRunner {...props} />);
    await userEvent.type(screen.getByRole("textbox", { name: "Your answer" }), "Draft answer");
    unmount();

    render(<BankPracticeRunner {...props} />);
    expect(await screen.findByDisplayValue("Draft answer")).toBeInTheDocument();
  });

  it("shows a question's guidance and saves self-review ticks with the answer", async () => {
    const guided = [
      { id: "g1", prompt: "Why the forces?", guidance: { assesses: "Genuine motivation.", tips: ["Give a personal reason."] } },
      { id: "g2", prompt: "Your hobbies?" },
    ];
    const props = { ...baseProps, moduleId: "personal-interview", responseItems: guided, selfReview: ["Specific example", "Honest"] };
    const { unmount } = render(<BankPracticeRunner {...props} />);
    expect(screen.getByText("What assessors look for")).toBeInTheDocument();
    expect(screen.getByText("Genuine motivation.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("checkbox", { name: "Specific example" }));
    expect(screen.getByText("Self-review (1 of 2)")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.queryByText("What assessors look for")).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Specific example" })).not.toBeChecked();
    unmount();

    render(<BankPracticeRunner {...props} />);
    await waitFor(() => expect(screen.getByRole("checkbox", { name: "Specific example" })).toBeChecked());
    expect(screen.getByRole("checkbox", { name: "Honest" })).not.toBeChecked();
  });

  it("renders nothing when a module has no items", () => {
    const { container } = render(<BankPracticeRunner {...baseProps} responseItems={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
