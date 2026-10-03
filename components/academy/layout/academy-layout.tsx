import { AcademyBrand } from "@/components/academy/layout/academy-brand";
import { AcademyHeader } from "@/components/academy/layout/academy-header";
import { AcademyMobileNav } from "@/components/academy/layout/academy-mobile-nav";
import { AcademyNavigation } from "@/components/academy/layout/academy-navigation";
import { AcademySidebarFooter } from "@/components/academy/layout/academy-sidebar-footer";
import { ACADEMY_NAVIGATION } from "@/lib/academy/navigation";

interface AcademyLayoutProps {
  academyName: string;
  adminName: string;
  children: React.ReactNode;
}

// Shell for every Academy page: navy sidebar (icon rail on tablet, drawer on
// mobile), sticky header, then the page content. Pages render only their own
// content — never their own chrome.
export function AcademyLayout({ academyName, adminName, children }: AcademyLayoutProps) {
  const roleLabel = "Academy Admin";

  return (
    <div className="academy-app flex min-h-screen">
      <aside
        aria-label="Academy sidebar"
        className="academy-sidebar sticky top-0 hidden h-screen w-[76px] shrink-0 flex-col gap-6 overflow-y-auto p-3 md:flex lg:w-[260px] lg:p-4 [@media(max-height:820px)]:gap-3 [@media(max-height:820px)]:py-3"
      >
        <AcademyBrand collapsible />
        <div className="flex-1">
          <AcademyNavigation items={ACADEMY_NAVIGATION} variant="rail" />
        </div>
        <AcademySidebarFooter academyName={academyName} adminName={adminName} collapsible />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <AcademyHeader
          academyName={academyName}
          adminName={adminName}
          roleLabel={roleLabel}
          searchPlaceholder="Search students, batches, mentors…"
          profileHref="/academy/settings"
          mobileNav={
            <AcademyMobileNav
              items={ACADEMY_NAVIGATION}
              footer={<AcademySidebarFooter academyName={academyName} adminName={adminName} />}
            />
          }
        />
        <main id="academy-content" className="mx-auto w-full max-w-[1360px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
