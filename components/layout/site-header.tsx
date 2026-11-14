import Link from "next/link";
import { BrandLogo } from "@/components/layout/brand-logo";
import { SiteMobileMenu } from "@/components/layout/site-mobile-menu";
import { SITE_NAV_LINKS } from "@/components/layout/site-nav-links";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--site-line)] bg-[var(--site-bg)]">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-12">
        <Link href="/" className="site-link flex items-center gap-2 text-[var(--site-navy)]" aria-label="EliteCadet home">
          <BrandLogo size={36} />
          <span className="text-xl font-semibold tracking-tight">EliteCadet</span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-5 lg:flex xl:gap-8">
          {SITE_NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className="site-link whitespace-nowrap py-2 text-sm">
              {label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex xl:gap-3">
          <Link href="/request-demo" className="site-btn site-btn-secondary site-btn-sm">
            Request Demo
          </Link>
          <Link href="/login" className="site-btn site-btn-secondary site-btn-sm">
            Login
          </Link>
          <Link href="/signup" className="site-btn site-btn-primary site-btn-sm">
            Sign Up
          </Link>
        </div>

        <SiteMobileMenu />
      </div>
    </header>
  );
}
