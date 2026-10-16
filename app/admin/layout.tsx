import { WorkspaceLayout } from "@/components/layout/workspace/workspace-layout";
import { requireRole } from "@/lib/server/auth/guard";
import { getMyUnreadCount } from "@/lib/server/notifications/service";
import type { WorkspaceNavItem } from "@/lib/navigation/workspace";

// Super Admin workspace (specs.md §8a).
const NAV_ITEMS: WorkspaceNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "dashboard", availability: "available" },
  { href: "/admin/users", label: "User Management", icon: "users", availability: "available" },
  { href: "/admin/academies", label: "Academies", icon: "academy", availability: "available" },
  { href: "/admin/content", label: "Content Library", icon: "content", availability: "available" },
  { href: "/admin/content-requests", label: "Content Requests", icon: "checklist", availability: "available" },
  { href: "/admin/practice", label: "Practice Banks", icon: "practice", availability: "available" },
  { href: "/admin/analytics", label: "Analytics", icon: "reports", availability: "available" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireRole("super_admin");
  const name = actor.profile.fullName || "Super Admin";
  const unreadCount = await getMyUnreadCount();

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
      unreadCount={unreadCount}
    >
      {children}
    </WorkspaceLayout>
  );
}
