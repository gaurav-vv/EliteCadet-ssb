import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Day2ResourceList } from "@/components/student/day2/day2-resource-list";
import { DAY2_SECTIONS } from "@/lib/day2/sections";
import { getDay2ResourcesByCategory } from "@/lib/mock/day2-resources";

// Uses the real curated dataset, scoped to one category + one section — this
// component only ever renders resources for the single section the student
// picked, never the whole test's library.
const TAT_RESOURCES = getDay2ResourcesByCategory("tat");
const LEARN_SECTION = DAY2_SECTIONS.find((s) => s.key === "learn")!;
const PRACTICE_SECTION = DAY2_SECTIONS.find((s) => s.key === "practice")!;

describe("Day2ResourceList", () => {
  it("shows only the resources matching the selected section", () => {
    const learnResources = TAT_RESOURCES.filter(LEARN_SECTION.match);
    render(
      <Day2ResourceList
        category="tat"
        sectionKey={LEARN_SECTION.key}
        resources={learnResources}
        backHref="/student/resources/day-2/tat"
      />,
    );
    for (const resource of learnResources) {
      expect(screen.getAllByText(resource.name).length).toBeGreaterThan(0);
    }
  });

  it("provides a way back to choosing a different focus", () => {
    const learnResources = TAT_RESOURCES.filter(LEARN_SECTION.match);
    render(
      <Day2ResourceList
        category="tat"
        sectionKey={LEARN_SECTION.key}
        resources={learnResources}
        backHref="/student/resources/day-2/tat"
      />,
    );
    const backLink = screen.getByRole("link", { name: /choose a different focus/i });
    expect(backLink).toHaveAttribute("href", "/student/resources/day-2/tat");
  });

  it("narrows results with the search box and shows an empty state for no matches", async () => {
    const user = userEvent.setup();
    const practiceResources = TAT_RESOURCES.filter(PRACTICE_SECTION.match);
    render(
      <Day2ResourceList
        category="tat"
        sectionKey={PRACTICE_SECTION.key}
        resources={practiceResources}
        backHref="/student/resources/day-2/tat"
      />,
    );

    await user.type(screen.getByRole("searchbox", { name: /search resources/i }), "zzzznotarealresourcenamezzzz");

    expect(await screen.findByText("No resources match this search")).toBeInTheDocument();
  });

  it("never shows verification-status or pricing/access labels on a resource card", () => {
    const practiceResources = TAT_RESOURCES.filter(PRACTICE_SECTION.match);
    render(
      <Day2ResourceList
        category="tat"
        sectionKey={PRACTICE_SECTION.key}
        resources={practiceResources}
        backHref="/student/resources/day-2/tat"
      />,
    );
    // Exact-match only: resource descriptions legitimately use the word
    // "verified" in prose (e.g. "the largest verified TAT practice bank") —
    // what must never appear is a standalone status badge with that text.
    expect(screen.queryByText(/^Verified$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Needs verification$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Free$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Paid$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Freemium$/)).not.toBeInTheDocument();
  });

  it("renders every external resource link with a real URL, opening safely in a new tab", () => {
    const practiceResources = TAT_RESOURCES.filter(PRACTICE_SECTION.match);
    render(
      <Day2ResourceList
        category="tat"
        sectionKey={PRACTICE_SECTION.key}
        resources={practiceResources}
        backHref="/student/resources/day-2/tat"
      />,
    );
    const links = screen.getAllByRole("link").filter((el) => el.getAttribute("href")?.startsWith("http"));
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
      expect(link.getAttribute("href")).toMatch(/^https:\/\//);
    }
  });
});
