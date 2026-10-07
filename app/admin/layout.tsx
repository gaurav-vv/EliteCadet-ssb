import { AppShell } from "@/components/layout/app-shell";
import type { SidebarNavItem } from "@/components/layout/sidebar";
import { requireRole } from "@/lib/server/auth/guard";

// Super Admin workspace (specs.md §8a). Only items that exist are listed:
// Academies, Content, Analytics etc. are added by the phase that builds them.
const NAV_ITEMS: SidebarNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "dashboard" },
  { href: "/admin/users", label: "User Management", icon: "users" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireRole("super_admin");

  return (
    <AppShell
      roleLabel="Super Admin"
      items={NAV_ITEMS}
      searchPlaceholder="Search users…"
      userName={actor.profile.fullName || "Super Admin"}
      profileHref={`/admin/users/${actor.id}`}
    >
      {children}
    </AppShell>
  );
}
