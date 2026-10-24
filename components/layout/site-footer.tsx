import Link from "next/link";
import { Layers } from "lucide-react";
import { SITE_NAV_LINKS } from "@/components/layout/site-nav-links";

const ACCOUNT_LINKS = [
  { href: "/request-demo", label: "Request Demo" },
  { href: "/login", label: "Login" },
  { href: "/signup", label: "Sign Up" },
] as const;

// Public-site footer (`.site-public` theme). Signed-in workspaces use
// WorkspaceFooter; standalone pages use MinimalFooter. See DESIGN.md.
export function SiteFooter() {
  return (
    <footer id="about" className="scroll-mt-20 border-t border-[var(--site-line)] bg-[var(--site-bg-soft)]">
      <div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-10 sm:px-6 md:grid-cols-[2fr_1fr_1fr] lg:px-12">
        <div className="flex max-w-sm flex-col gap-3">
          <Link href="/" className="site-link flex items-center gap-2 text-[var(--site-navy)]" aria-label="EliteCadet home">
            <Layers aria-hidden="true" className="size-6" strokeWidth={2.2} />
            <span className="text-lg font-semibold tracking-tight">EliteCadet</span>
          </Link>
          <p className="text-sm text-[var(--site-muted)]">
            SSB preparation with structured practice, AI-assisted feedback and mentor guidance.
          </p>
        </div>

        <nav aria-label="Explore" className="flex flex-col gap-2">
          <p className="site-eyebrow">Explore</p>
          {SITE_NAV_LINKS.filter(({ label }) => label !== "Home" && label !== "About").map(({ href, label }) => (
            <Link key={href} href={href} className="site-link w-fit text-sm">
              {label}
            </Link>
          ))}
        </nav>

        <nav aria-label="Account" className="flex flex-col gap-2">
          <p className="site-eyebrow">Get started</p>
          {ACCOUNT_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className="site-link w-fit text-sm">
              {label}
            </Link>
          ))}
        </nav>
      </div>

      <p className="mx-auto max-w-[1440px] border-t border-[var(--site-line)] px-4 py-5 text-sm text-[var(--site-muted)] sm:px-6 lg:px-12">
        &copy; {new Date().getFullYear()} EliteCadet. All rights reserved.
      </p>
    </footer>
  );
}
