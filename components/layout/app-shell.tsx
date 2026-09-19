import { Sidebar, type SidebarNavItem } from "@/components/layout/sidebar";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { TopHeader } from "@/components/layout/top-header";

interface AppShellProps {
  roleLabel: string;
  items: SidebarNavItem[];
  searchPlaceholder: string;
  userName: string;
  profileHref: string;
  children: React.ReactNode;
}

export function AppShell({ roleLabel, items, searchPlaceholder, userName, profileHref, children }: AppShellProps) {
  return (
    <div className="flex min-h-full flex-col pb-24 md:pb-6">
      <TopHeader searchPlaceholder={searchPlaceholder} userName={userName} roleLabel={roleLabel} profileHref={profileHref} />
      <div className="mx-auto flex w-full max-w-[1120px] flex-1 gap-6 px-4 pt-6 sm:px-8 md:px-6 lg:px-12">
        <Sidebar roleLabel={roleLabel} items={items} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <MobileTabBar items={items} />
    </div>
  );
}
