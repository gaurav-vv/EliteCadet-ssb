import { AppShell } from "@/components/layout/app-shell";
import type { SidebarNavItem } from "@/components/layout/sidebar";
import { getCurrentUserAndProfile } from "@/lib/auth/session";
import { markMentorActive } from "@/lib/mock/academy";

const NAV_ITEMS: SidebarNavItem[] = [
  { href: "/mentor", label: "Dashboard", icon: "dashboard" },
  { href: "/mentor/mentees", label: "Mentees", icon: "mentees" },
  { href: "/mentor/evaluations", label: "Evaluations", icon: "evaluations" },
  { href: "/mentor/sessions", label: "Sessions", icon: "sessions" },
  { href: "/mentor/profile", label: "Profile", icon: "profile" },
];

export default async function MentorLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getCurrentUserAndProfile();
  if (user) markMentorActive(user.id);

  return (
    <AppShell
      roleLabel="Mentor"
      items={NAV_ITEMS}
      searchPlaceholder="Search mentees…"
      userName={profile?.fullName || "Mentor"}
      profileHref="/mentor/profile"
    >
      {children}
    </AppShell>
  );
}
