import { WorkspaceLayout } from "@/components/layout/workspace/workspace-layout";
import { getCurrentUserAndProfile } from "@/lib/auth/session";
import type { WorkspaceNavItem } from "@/lib/navigation/workspace";

const NAV_ITEMS: WorkspaceNavItem[] = [
  { href: "/student", label: "Dashboard", icon: "dashboard", availability: "available" },
  { href: "/student/practice", label: "Practice", icon: "practice", availability: "available" },
  { href: "/student/sessions", label: "Sessions", icon: "sessions", availability: "available" },
  { href: "/student/progress", label: "Progress", icon: "progress", availability: "available" },
  { href: "/student/resources", label: "Resources", icon: "resources", availability: "available" },
  { href: "/student/library", label: "Library", icon: "content", availability: "available" },
  { href: "/student/profile", label: "Profile", icon: "profile", availability: "available" },
];

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getCurrentUserAndProfile();
  const name = profile?.fullName || "Student";

  return (
    <WorkspaceLayout
      workspaceLabel="Student"
      roleLabel="Student"
      items={NAV_ITEMS}
      userName={name}
      displayName={name}
      contextName="Student"
      searchPlaceholder="Search practice, resources, news…"
      searchLabel="Search practice, resources and news"
      profileHref="/student/profile"
      profileLabel="Profile"
    >
      {children}
    </WorkspaceLayout>
  );
}
