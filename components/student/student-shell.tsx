import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import type { SidebarNavItem } from "@/components/layout/sidebar";
import { TopHeader } from "@/components/layout/top-header";
import { StudentSidebar } from "@/components/student/student-sidebar";
import { getBrandImage } from "@/lib/academy/brand-images";

interface StudentShellProps {
  items: SidebarNavItem[];
  userName: string;
  profileHref: string;
  children: React.ReactNode;
}

// Student-only shell: full-height sidebar on the left, header + content on
// the right so the content (and the news panel) reaches the viewport edge.
export function StudentShell({ items, userName, profileHref, children }: StudentShellProps) {
  return (
    <div className="flex min-h-full">
      <StudentSidebar items={items} cardImage={getBrandImage("sidebar-card")} userName={userName} />
      <div className="flex min-w-0 flex-1 flex-col pb-24 md:pb-8">
        <TopHeader
          searchPlaceholder="Search practice, resources, news…"
          userName={userName}
          roleLabel="Student"
          profileHref={profileHref}
          showBrand={false}
        />
        <main className="mx-auto w-full max-w-[1280px] min-w-0 flex-1 px-4 pt-6 sm:px-8 xl:px-10">{children}</main>
      </div>
      <MobileTabBar items={items} />
    </div>
  );
}
