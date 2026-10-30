import { FlashToast } from "@/components/shared/flash-toast";
import { WorkspaceBrand } from "@/components/layout/workspace/workspace-brand";
import { WorkspaceFooter } from "@/components/layout/workspace/workspace-footer";
import { WorkspaceHeader } from "@/components/layout/workspace/workspace-header";
import { WorkspaceMobileNav } from "@/components/layout/workspace/workspace-mobile-nav";
import { WorkspaceNavigation } from "@/components/layout/workspace/workspace-navigation";
import { WorkspaceSidebarFooter } from "@/components/layout/workspace/workspace-sidebar-footer";
import type { WorkspaceNavItem } from "@/lib/navigation/workspace";

interface WorkspaceLayoutProps {
  // Under the wordmark and in the header: makes the signed-in role obvious.
  workspaceLabel: string;
  roleLabel: string;
  items: WorkspaceNavItem[];
  userName: string;
  // The header's main line: the academy name for Academy, else the user's name.
  displayName: string;
  // Second line in the sidebar footer, e.g. the academy name or the role.
  contextName: string;
  searchPlaceholder: string;
  searchLabel: string;
  // Where the header search submits (GET ?q=); omitted → the field is inert.
  searchAction?: string;
  // Title the header shows instead of its search on searchAction's own page.
  searchPageTitle?: string;
  profileHref: string;
  profileLabel: string;
  // Unread badge on the bell (the role layout reads it server-side).
  unreadCount?: number;
  children: React.ReactNode;
}

// The one shell for every signed-in workspace (Student, Mentor, Academy,
// Super Admin): navy sidebar (icon rail on tablet, drawer on mobile), sticky
// header, then the page content. The footer sits under the whole shell so it
// spans the full width, like the public footer. Pages render only their own content.
export function WorkspaceLayout({
  workspaceLabel,
  roleLabel,
  items,
  userName,
  displayName,
  contextName,
  searchPlaceholder,
  searchLabel,
  searchAction,
  searchPageTitle,
  profileHref,
  profileLabel,
  unreadCount = 0,
  children,
}: WorkspaceLayoutProps) {
  const homeHref = items[0]?.href ?? "/";

  return (
    <div className="workspace-app flex min-h-screen flex-col">
      <div className="flex flex-1">
        <aside
          aria-label={`${workspaceLabel} sidebar`}
          className="workspace-sidebar sticky top-0 hidden h-screen w-[76px] shrink-0 flex-col gap-6 overflow-y-auto p-3 md:flex lg:w-[260px] lg:p-4 [@media(max-height:820px)]:gap-3 [@media(max-height:820px)]:py-3"
        >
          <WorkspaceBrand
            href={homeHref}
            workspaceLabel={workspaceLabel}
            collapsible
          />
          <div className="flex-1">
            <WorkspaceNavigation
              items={items}
              label={workspaceLabel}
              variant="rail"
            />
          </div>
          <WorkspaceSidebarFooter
            userName={userName}
            contextName={contextName}
            collapsible
          />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <WorkspaceHeader
            displayName={displayName}
            userName={userName}
            roleLabel={roleLabel}
            searchPlaceholder={searchPlaceholder}
            searchLabel={searchLabel}
            searchAction={searchAction}
            searchPageTitle={searchPageTitle}
            profileHref={profileHref}
            profileLabel={profileLabel}
            unreadCount={unreadCount}
            notificationsHref={`${homeHref}/notifications`}
            mobileNav={
              <WorkspaceMobileNav
                items={items}
                workspaceLabel={workspaceLabel}
                footer={
                  <WorkspaceSidebarFooter
                    userName={userName}
                    contextName={contextName}
                  />
                }
              />
            }
          />
          <main
            id="workspace-content"
            className="mx-auto w-full max-w-[1360px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
          >
            {children}
          </main>
        </div>
      </div>
      <WorkspaceFooter workspaceLabel={workspaceLabel} />
      <FlashToast />
    </div>
  );
}
