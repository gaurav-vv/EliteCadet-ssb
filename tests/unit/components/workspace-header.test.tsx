// Workspace header: on the search's own page (Student Resources, which has its
// own search bar) the header shows the page title instead of a second search
// field; everywhere else the header search stays.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const nav = vi.hoisted(() => ({ pathname: "/student" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname, useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("@/lib/auth/actions", () => ({ logoutAction: vi.fn() }));
vi.mock("@/lib/actions/notifications", () => ({ loadNotificationsAction: vi.fn(), markNotificationReadAction: vi.fn() }));

import { WorkspaceHeader } from "@/components/layout/workspace/workspace-header";

const header = () =>
  render(
    <WorkspaceHeader
      displayName="Asha Rao"
      userName="Asha Rao"
      roleLabel="Student"
      searchPlaceholder="Search resources, guides, articles…"
      searchLabel="Search resources, guides and articles"
      searchAction="/student/resources"
      searchPageTitle="Resources"
      profileHref="/student/profile"
      profileLabel="Profile"
      mobileNav={null}
      unreadCount={0}
      notificationsHref="/student/notifications"
    />,
  );

describe("WorkspaceHeader", () => {
  beforeEach(() => {
    nav.pathname = "/student";
  });

  it("shows the page title, not a second search, on the search's own page", () => {
    nav.pathname = "/student/resources";
    header();
    expect(screen.getByRole("heading", { level: 1, name: "Resources" })).toBeInTheDocument();
    expect(screen.queryByRole("search")).not.toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Account menu for Asha Rao" })).toBeInTheDocument();
  });

  it("keeps the header search on every other page, including other Resources pages", () => {
    for (const path of ["/student", "/student/resources/videos", "/student/resources/understanding-tat"]) {
      nav.pathname = path;
      const { unmount } = header();
      expect(screen.getByRole("search")).toHaveAttribute("action", "/student/resources");
      expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
      unmount();
    }
  });
});
