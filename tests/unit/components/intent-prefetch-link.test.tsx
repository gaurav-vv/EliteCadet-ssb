import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

// Stand-in for next/link that exposes the `prefetch` prop it received, so the test can see the policy.
vi.mock("next/link", () => ({
  default: ({ prefetch, children, href, ...rest }: { prefetch?: boolean | null; children: React.ReactNode; href: string }) => (
    <a href={href} data-prefetch={prefetch === false ? "off" : prefetch === null ? "default" : String(prefetch)} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/student" }));

import { WorkspaceNavigation } from "@/components/layout/workspace/workspace-navigation";
import { IntentPrefetchLink } from "@/components/ui/intent-prefetch-link";

describe("IntentPrefetchLink", () => {
  it("does not prefetch just because it is on screen", () => {
    render(<IntentPrefetchLink href="/student/practice">Practice</IntentPrefetchLink>);
    const link = screen.getByRole("link", { name: "Practice" });
    expect(link).toHaveAttribute("href", "/student/practice");
    expect(link).toHaveAttribute("data-prefetch", "off");
  });

  it.each([
    ["pointer over it", (el: HTMLElement) => fireEvent.mouseEnter(el)],
    ["keyboard focus", (el: HTMLElement) => fireEvent.focus(el)],
    ["a touch", (el: HTMLElement) => fireEvent.touchStart(el)],
  ])("switches to normal prefetching on %s", (_name, act) => {
    render(<IntentPrefetchLink href="/student/practice">Practice</IntentPrefetchLink>);
    const link = screen.getByRole("link", { name: "Practice" });
    expect(link).toHaveAttribute("data-prefetch", "off");
    act(link);
    expect(link).toHaveAttribute("data-prefetch", "default");
  });

  it("still runs the caller's own handlers and keeps the other props", () => {
    const onMouseEnter = vi.fn();
    const onFocus = vi.fn();
    const onClick = vi.fn();
    render(
      <IntentPrefetchLink href="/x" onMouseEnter={onMouseEnter} onFocus={onFocus} onClick={onClick} className="c" aria-label="Go X">
        X
      </IntentPrefetchLink>,
    );
    const link = screen.getByRole("link", { name: "Go X" });
    fireEvent.mouseEnter(link);
    fireEvent.focus(link);
    fireEvent.click(link);
    expect(onMouseEnter).toHaveBeenCalledTimes(1);
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(link).toHaveClass("c");
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
    expect(screen.getByRole("navigation", { name: "Student" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Practice" })).not.toHaveAttribute("aria-current");
    for (const name of ["Dashboard", "Practice", "Progress"]) {
      expect(screen.getByRole("link", { name })).toHaveAttribute("data-prefetch", "off");
    }
  });

  it("prefetches only the item the person points at", () => {
    render(<WorkspaceNavigation items={items} label="Student" />);
    fireEvent.mouseEnter(screen.getByRole("link", { name: "Progress" }));
    expect(screen.getByRole("link", { name: "Progress" })).toHaveAttribute("data-prefetch", "default");
    expect(screen.getByRole("link", { name: "Practice" })).toHaveAttribute("data-prefetch", "off");
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
