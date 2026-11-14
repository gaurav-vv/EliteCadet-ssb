import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SiteFooter } from "@/components/layout/site-footer";
import { MinimalFooter } from "@/components/layout/minimal-footer";
import { WorkspaceFooter } from "@/components/layout/workspace/workspace-footer";

describe("footers", () => {
  it("public footer links to the account routes and keeps the #about anchor", () => {
    const { container } = render(<SiteFooter />);
    expect(container.querySelector("footer#about")).not.toBeNull();
    expect(screen.getByRole("link", { name: "Login" }).getAttribute("href")).toBe("/login");
    expect(screen.getByRole("link", { name: "Sign Up" }).getAttribute("href")).toBe("/signup");
    expect(screen.getByRole("link", { name: "Request Demo" }).getAttribute("href")).toBe("/request-demo");
  });

  it("workspace footer names the workspace", () => {
    render(<WorkspaceFooter workspaceLabel="Mentor" />);
    expect(screen.getByText(/Mentor workspace/)).toBeTruthy();
  });

  it("minimal footer shows the copyright line", () => {
    render(<MinimalFooter />);
    expect(screen.getByText(/EliteCadet\. All rights reserved/)).toBeTruthy();
  });
});
