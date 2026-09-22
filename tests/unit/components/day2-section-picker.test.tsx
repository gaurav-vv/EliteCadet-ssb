import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Day2SectionPicker } from "@/components/student/day2/day2-section-picker";
import { getDay2ResourcesByCategory } from "@/lib/mock/day2-resources";

// Uses the real curated dataset — this is the "what do you want to do?"
// step between picking a test and seeing any resource, so it must only ever
// offer a section that genuinely has a matching resource.
const TAT_RESOURCES = getDay2ResourcesByCategory("tat");
const SDT_RESOURCES = getDay2ResourcesByCategory("sdt");

describe("Day2SectionPicker", () => {
  it("offers every section that has real resources for a well-covered test", () => {
    render(<Day2SectionPicker category="tat" resources={TAT_RESOURCES} basePath="/student/resources/day-2/tat" />);
    expect(screen.getByText("Learn Basics")).toBeInTheDocument();
    expect(screen.getByText("Practice")).toBeInTheDocument();
    expect(screen.getByText("Tests")).toBeInTheDocument();
    expect(screen.getByText("Videos")).toBeInTheDocument();
    expect(screen.getByText("Articles")).toBeInTheDocument();
    expect(screen.getByText("Feedback")).toBeInTheDocument();
  });

  it("does not offer a section with no matching resource for a thin test (SD/SDT has no test series, videos or feedback)", () => {
    render(<Day2SectionPicker category="sdt" resources={SDT_RESOURCES} basePath="/student/resources/day-2/sd-sdt" />);
    expect(screen.getByText("Learn Basics")).toBeInTheDocument();
    expect(screen.getByText("Practice")).toBeInTheDocument();
    expect(screen.getByText("Articles")).toBeInTheDocument();
    expect(screen.queryByText("Tests")).not.toBeInTheDocument();
    expect(screen.queryByText("Videos")).not.toBeInTheDocument();
    expect(screen.queryByText("Feedback")).not.toBeInTheDocument();
  });

  it("links each section into the category page via a `do` query, not straight to a resource", () => {
    render(<Day2SectionPicker category="tat" resources={TAT_RESOURCES} basePath="/student/resources/day-2/tat" />);
    const links = screen.getAllByRole("link", { name: /explore/i });
    for (const link of links) {
      expect(link.getAttribute("href")).toMatch(/^\/student\/resources\/day-2\/tat\?do=/);
    }
  });
});
