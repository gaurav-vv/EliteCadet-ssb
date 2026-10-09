import { WorkspaceLayout } from "@/components/layout/workspace/workspace-layout";
import { getCurrentUserAndProfile } from "@/lib/auth/session";
import { getMyUnreadCount } from "@/lib/server/notifications/service";
import type { WorkspaceNavItem } from "@/lib/navigation/workspace";

const NAV_ITEMS: WorkspaceNavItem[] = [
  { href: "/mentor", label: "Dashboard", icon: "dashboard", availability: "available" },
  { href: "/mentor/mentees", label: "Mentees", icon: "mentees", availability: "available" },
  { href: "/mentor/assessments", label: "Assessments", icon: "checklist", availability: "available" },
  { href: "/mentor/evaluations", label: "Evaluations", icon: "evaluations", availability: "available" },
  { href: "/mentor/sessions", label: "Sessions", icon: "sessions", availability: "available" },
  { href: "/mentor/content", label: "My Content", icon: "content", availability: "available" },
  { href: "/mentor/library", label: "Library", icon: "resources", availability: "available" },
  { href: "/mentor/profile", label: "Profile", icon: "profile", availability: "available" },
];

export default async function MentorLayout({ children }: { children: React.ReactNode }) {
  const [{ profile }, unreadCount] = await Promise.all([getCurrentUserAndProfile(), getMyUnreadCount()]);
  const name = profile?.fullName || "Mentor";

  return (
    <WorkspaceLayout
      workspaceLabel="Mentor"
      roleLabel="Mentor"
      items={NAV_ITEMS}
      userName={name}
      displayName={name}
      contextName="Mentor"
      searchPlaceholder="Search mentees…"
      searchLabel="Search mentees"
      profileHref="/mentor/profile"
      profileLabel="Profile"
      unreadCount={unreadCount}
    >
      {children}
    </WorkspaceLayout>
  );
}
