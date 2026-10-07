import { WorkspaceLayout } from "@/components/layout/workspace/workspace-layout";
import { requireRole } from "@/lib/server/auth/guard";
import type { WorkspaceNavItem } from "@/lib/navigation/workspace";

// Super Admin workspace (specs.md §8a). "soon" items are later phases:
// Analytics (T089) — flip to "available" when it ships.
const NAV_ITEMS: WorkspaceNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "dashboard", availability: "available" },
  { href: "/admin/users", label: "User Management", icon: "users", availability: "available" },
  { href: "/admin/academies", label: "Academies", icon: "academy", availability: "available" },
  { href: "/admin/content", label: "Content Library", icon: "content", availability: "available" },
  { href: "/admin/content-requests", label: "Content Requests", icon: "checklist", availability: "available" },
  { href: "/admin/analytics", label: "Analytics", icon: "reports", availability: "soon" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireRole("super_admin");
  const name = actor.profile.fullName || "Super Admin";

  return (
    <WorkspaceLayout
      workspaceLabel="Super Admin"
      roleLabel="Super Admin"
      items={NAV_ITEMS}
      userName={name}
      displayName={name}
      contextName="Platform"
      searchPlaceholder="Search users…"
      searchLabel="Search users"
      profileHref={`/admin/users/${actor.id}`}
      profileLabel="My account"
    >
      {children}
    </WorkspaceLayout>
  );
}
