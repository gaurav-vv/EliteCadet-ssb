import { AppShell } from "@/components/layout/app-shell";
import type { SidebarNavItem } from "@/components/layout/sidebar";
import { getCurrentUserAndProfile } from "@/lib/auth/session";

const NAV_ITEMS: SidebarNavItem[] = [
  { href: "/academy", label: "Dashboard", icon: "dashboard" },
  { href: "/academy/students", label: "Students", icon: "students" },
  { href: "/academy/batches", label: "Batches", icon: "batches" },
  { href: "/academy/mentors", label: "Mentors", icon: "mentees" },
  { href: "/academy/reports", label: "Reports", icon: "reports" },
  { href: "/academy/settings", label: "Settings", icon: "settings" },
];

export default async function AcademyLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getCurrentUserAndProfile();

  return (
    <AppShell
      roleLabel="Academy Admin"
      items={NAV_ITEMS}
      searchPlaceholder="Search students, mentors…"
      userName={profile?.fullName || "Admin"}
      profileHref="/academy/settings"
    >
      {children}
    </AppShell>
  );
}
