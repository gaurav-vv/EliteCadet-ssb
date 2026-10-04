import type { SidebarNavItem } from "@/components/layout/sidebar";
import { StudentShell } from "@/components/student/student-shell";
import { getCurrentUserAndProfile } from "@/lib/auth/session";

const NAV_ITEMS: SidebarNavItem[] = [
  { href: "/student", label: "Dashboard", icon: "dashboard" },
  { href: "/student/practice", label: "Practice", icon: "practice" },
  { href: "/student/progress", label: "Progress", icon: "progress" },
  { href: "/student/resources", label: "Resources", icon: "resources" },
  { href: "/student/profile", label: "Profile", icon: "profile" },
];

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getCurrentUserAndProfile();

  return (
    <StudentShell items={NAV_ITEMS} userName={profile?.fullName || "Student"} profileHref="/student/profile">
      {children}
    </StudentShell>
  );
}
