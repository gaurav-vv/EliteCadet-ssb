import { AppShell } from "@/components/layout/app-shell";
import type { SidebarNavItem } from "@/components/layout/sidebar";
import { ADMIN_AREA_LABELS, canAccess } from "@/lib/admin/access";
import { requireAdminArea } from "@/lib/auth/admin";
import { getCurrentUserAndProfile } from "@/lib/auth/session";

// The header's "Profile" item goes to the person's own role profile — /admin
// has no profile of its own.
const PROFILE_HREF = { student: "/student/profile", mentor: "/mentor/profile", academy_admin: "/academy/settings" } as const;

// Each area's nav entry only exists for someone who can open it; the
// middleware and every page re-check on the server regardless.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { grants } = await requireAdminArea("any");
  const { profile } = await getCurrentUserAndProfile();

  const items: SidebarNavItem[] = [{ href: "/admin", label: "Overview", icon: "dashboard" }];
  if (canAccess(grants, "student_content")) {
    items.push({ href: "/admin/student-content", label: ADMIN_AREA_LABELS.student_content, icon: "practice" });
  }
  if (canAccess(grants, "mentor_content")) {
    items.push({ href: "/admin/mentor-content", label: ADMIN_AREA_LABELS.mentor_content, icon: "evaluations" });
  }
  if (canAccess(grants, "academy_content")) {
    items.push({ href: "/admin/academy-content", label: ADMIN_AREA_LABELS.academy_content, icon: "academy" });
  }
  if (canAccess(grants, "super")) {
    items.push({ href: "/admin/access", label: "Access", icon: "access" });
  }

  return (
    <AppShell
      roleLabel="Admin"
      items={items}
      searchPlaceholder="Search content…"
      userName={profile?.fullName || "Admin"}
      profileHref={profile ? PROFILE_HREF[profile.role] : "/"}
    >
      {children}
    </AppShell>
  );
}
