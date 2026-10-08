import { WorkspaceLayout } from "@/components/layout/workspace/workspace-layout";
import { ACADEMY_NAVIGATION } from "@/lib/academy/navigation";

interface AcademyLayoutProps {
  academyName: string;
  adminName: string;
  unreadCount?: number;
  children: React.ReactNode;
}

// Academy's configuration of the shared workspace shell.
export function AcademyLayout({ academyName, adminName, unreadCount, children }: AcademyLayoutProps) {
  return (
    <WorkspaceLayout
      workspaceLabel="Academy"
      roleLabel="Academy Admin"
      items={ACADEMY_NAVIGATION}
      userName={adminName}
      displayName={academyName}
      contextName={academyName}
      searchPlaceholder="Search students, batches, mentors…"
      searchLabel="Search students, batches and mentors"
      profileHref="/academy/settings"
      profileLabel="Academy settings"
      unreadCount={unreadCount}
    >
      {children}
    </WorkspaceLayout>
  );
}
