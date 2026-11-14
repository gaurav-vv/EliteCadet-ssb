import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const prefetch = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ prefetch, push: vi.fn() }), usePathname: () => "/student" }));

import { WorkspaceNavigation } from "@/components/layout/workspace/workspace-navigation";
import { IntentPrefetchLink } from "@/components/ui/intent-prefetch-link";

beforeEach(() => prefetch.mockReset());

describe("IntentPrefetchLink", () => {
  it("does not prefetch just because it is on screen", () => {
    render(<IntentPrefetchLink href="/student/practice">Practice</IntentPrefetchLink>);
    expect(screen.getByRole("link", { name: "Practice" })).toHaveAttribute("href", "/student/practice");
    expect(prefetch).not.toHaveBeenCalled();
  });

  it.each([
    ["pointer over it", (el: HTMLElement) => fireEvent.mouseEnter(el)],
    ["keyboard focus", (el: HTMLElement) => fireEvent.focus(el)],
    ["a touch", (el: HTMLElement) => fireEvent.touchStart(el)],
  ])("prefetches on %s, once", (_name, act) => {
    render(<IntentPrefetchLink href="/student/practice">Practice</IntentPrefetchLink>);
    const link = screen.getByRole("link", { name: "Practice" });
    act(link);
    act(link);
    fireEvent.mouseEnter(link);
    expect(prefetch).toHaveBeenCalledTimes(1);
    expect(prefetch).toHaveBeenCalledWith("/student/practice");
  });

  it("still runs the caller's own handlers", () => {
    const onMouseEnter = vi.fn();
    const onFocus = vi.fn();
    render(
      <IntentPrefetchLink href="/x" onMouseEnter={onMouseEnter} onFocus={onFocus}>
        X
      </IntentPrefetchLink>,
    );
    const link = screen.getByRole("link", { name: "X" });
    fireEvent.mouseEnter(link);
    fireEvent.focus(link);
    expect(onMouseEnter).toHaveBeenCalledTimes(1);
    expect(onFocus).toHaveBeenCalledTimes(1);
  });
});

describe("WorkspaceNavigation", () => {
  const items = [
    { href: "/student", label: "Dashboard", icon: "dashboard" as const, availability: "available" as const },
    { href: "/student/practice", label: "Practice", icon: "practice" as const, availability: "available" as const },
    { href: "/student/progress", label: "Progress", icon: "progress" as const, availability: "available" as const },
    { href: "/student/soon", label: "Later", icon: "reports" as const, availability: "soon" as const },
  ];

  it("renders every available item as a link, marks the current one, and prefetches none on render", () => {
    render(<WorkspaceNavigation items={items} label="Student" />);
    const nav = screen.getByRole("navigation", { name: "Student" });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Practice" })).not.toHaveAttribute("aria-current");
    expect(prefetch).not.toHaveBeenCalled();
  });

  it("prefetches only the item the person points at", () => {
    render(<WorkspaceNavigation items={items} label="Student" />);
    fireEvent.mouseEnter(screen.getByRole("link", { name: "Progress" }));
    expect(prefetch).toHaveBeenCalledTimes(1);
    expect(prefetch).toHaveBeenCalledWith("/student/progress");
  });

  it("keeps a 'soon' item as a disabled, non-navigating entry", () => {
    render(<WorkspaceNavigation items={items} label="Student" />);
    const soon = screen.getByTitle("Later — coming soon");
    expect(soon).toHaveAttribute("aria-disabled", "true");
    expect(soon).not.toHaveAttribute("href");
  });

  it("still calls onNavigate (closes the mobile drawer) when an item is clicked", () => {
    const onNavigate = vi.fn();
    render(<WorkspaceNavigation items={items} label="Student" onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole("link", { name: "Practice" }));
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
