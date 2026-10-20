import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AiFeedbackView } from "@/components/practice/ai-feedback";

const evaluation = {
  label: "AI-generated practice evaluation",
  overallConfidence: "low" as const,
  createdAt: "2026-10-19T00:00:00Z",
  feedback: { observation: "Most stories end with a plan.", evidence: "Story 2.", impact: "Shows action.", improvementAction: "Add an outcome.", recommendedPractice: "Write three endings." },
  dimensions: [{ id: "action", name: "Action toward the goal", rating: "needs_attention" as const, confidence: "low" as const, evidence: ["he waits"], note: "Few stories act." }],
};

describe("AiFeedbackView", () => {
  it("labels feedback as an AI practice evaluation that says nothing about selection", () => {
    render(<AiFeedbackView state={{ status: "ready", evaluation }} />);
    expect(screen.getByText("AI-generated practice evaluation.")).toBeInTheDocument();
    expect(screen.getByText(/not an SSB assessment and says nothing about selection/)).toBeInTheDocument();
  });

  it("shows ratings as words (never a number) with their evidence and confidence", () => {
    const { container } = render(<AiFeedbackView state={{ status: "ready", evaluation }} />);
    expect(screen.getByText("Needs attention")).toBeInTheDocument();
    expect(screen.getByText("“he waits”")).toBeInTheDocument();
    expect(screen.getAllByText("Low confidence — based on little evidence").length).toBeGreaterThan(0);
    expect(container.textContent).not.toMatch(/\d+\s*%/);
    expect(screen.getByRole("heading", { name: "Observed practice patterns" })).toBeInTheDocument();
  });

  it("explains pending, unavailable and empty states without losing the answers", () => {
    const { rerender } = render(<AiFeedbackView state={{ status: "pending" }} />);
    expect(screen.getByRole("status")).toHaveTextContent("Your answers are saved");
    rerender(<AiFeedbackView state={{ status: "unavailable" }} />);
    expect(screen.getByText("AI feedback isn't available for this attempt")).toBeInTheDocument();
    rerender(<AiFeedbackView state={{ status: "none" }} audience="mentor" />);
    expect(screen.getByText("No feedback for this attempt")).toBeInTheDocument();
  });
});
