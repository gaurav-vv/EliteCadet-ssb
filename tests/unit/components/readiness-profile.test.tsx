import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReadinessProfileView, ReadinessStrip } from "@/components/progress/readiness-profile";
import { buildReadiness } from "@/lib/server/readiness/compute";

const profile = buildReadiness(
  {
    accountCreatedAt: "2026-09-01T00:00:00Z",
    mentor: [{ category: "psychology", n: 2, avgPct: 50, recentAvg: 50, previousAvg: null }],
    ai: [],
    practice: { done28d: 4, tests28d: 1, interviews28d: 0, repeatsAfterFeedback28d: 0 },
    library28d: 0,
    attendance: { present: 0, absent: 0 },
    activeDays28: 14,
    activeDays7: 3,
  },
  "2026-10-19T06:00:00Z",
);

describe("ReadinessProfileView", () => {
  it("shows every dimension as a word with evidence, and says it is not a score", () => {
    const { container } = render(<ReadinessProfileView profile={profile} />);
    expect(screen.getByText(/not a score or an SSB result/)).toBeInTheDocument();
    expect(screen.getByText("Psychology")).toBeInTheDocument();
    expect(screen.getAllByText("Not enough evidence yet").length).toBeGreaterThan(0);
    expect(screen.getByText("Strong")).toBeInTheDocument();
    expect(screen.getByText("2 mentor reviews averaging 50%")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/readiness[^.]{0,20}\d+\s*%/i);
  });

  it("the dashboard strip links to the evidence", () => {
    render(<ReadinessStrip profile={profile} />);
    expect(screen.getByRole("link", { name: "See the evidence" })).toHaveAttribute("href", "/student/progress");
    expect(screen.getAllByRole("listitem")).toHaveLength(7);
  });
});
