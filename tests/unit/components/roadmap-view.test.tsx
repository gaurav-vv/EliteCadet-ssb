import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RoadmapView } from "@/components/roadmap/roadmap-view";
import type { Roadmap } from "@/types/roadmap";

const roadmap: Roadmap = {
  stage: { id: "core_preparation", label: "Core preparation", explanation: "Work steadily on your weaker areas." },
  selfReportedStage: "Just starting",
  daysToTarget: 40,
  focus: [{ dimension: "psychology", name: "Psychology", state: "needs_attention", why: "4 mentor reviews averaging 41%", action: { title: "Take a timed psychology test", reason: "Psychology is your weakest area.", href: "/student/practice/psychology" } }],
  weekPlan: [{ label: "Psychology", minutes: 30 }],
  today: [{ title: "Take a timed psychology test", reason: "Psychology is your weakest area.", href: "/student/practice/psychology" }],
  basedOn: ["your starting-point diagnostic", "your readiness profile"],
};

describe("RoadmapView", () => {
  it("shows the suggested stage next to the student's own, with every action's reason", () => {
    render(<RoadmapView roadmap={roadmap} />);
    expect(screen.getByRole("heading", { name: "Core preparation" })).toBeInTheDocument();
    expect(screen.getByText("You said: Just starting")).toBeInTheDocument();
    expect(screen.getByText("40 days to your SSB date")).toBeInTheDocument();
    expect(screen.getByText("Why: Psychology is your weakest area.")).toBeInTheDocument();
    expect(screen.getByText(/says nothing about selection/)).toBeInTheDocument();
    expect(screen.getByText("Core preparation", { selector: "li" })).toHaveAttribute("aria-current", "step");
  });
});
