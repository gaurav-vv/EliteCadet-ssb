import Link from "next/link";
import { BrandLogo } from "@/components/layout/brand-logo";
import { SITE_NAV_LINKS } from "@/components/layout/site-nav-links";

const ACCOUNT_LINKS = [
  { href: "/request-demo", label: "Request Demo" },
  { href: "/login", label: "Login" },
  { href: "/signup", label: "Sign Up" },
] as const;

// Dark footer text/links. Not `.site-link`/`.site-eyebrow`: those set a dark
// text colour that would vanish on the navy background.
const linkClass =
  "w-fit rounded-[var(--site-radius-sm)] text-sm text-white/75 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";
const headingClass = "text-[0.8125rem] font-medium tracking-[0.14em] text-white/60 uppercase";

// Public-site footer (`.site-public` theme), dark navy. Signed-in workspaces
// use WorkspaceFooter; standalone pages use MinimalFooter. See DESIGN.md.
export function SiteFooter() {
  return (
    <footer id="about" className="scroll-mt-20 bg-[var(--site-navy)] text-white">
      <div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-10 sm:px-6 md:grid-cols-[2fr_1fr_1fr] lg:px-12">
        <div className="flex max-w-sm flex-col gap-3">
          <Link href="/" className={`${linkClass} flex items-center gap-2 text-white`} aria-label="EliteCadet home">
            <BrandLogo size={40} />
            <span className="text-lg font-semibold tracking-tight">EliteCadet</span>
          </Link>
          <p className="text-sm text-white/75">
            SSB preparation with structured practice, AI-assisted feedback and mentor guidance.
          </p>
        </div>

        <nav aria-label="Explore" className="flex flex-col gap-2">
          <p className={headingClass}>Explore</p>
          {SITE_NAV_LINKS.filter(({ label }) => label !== "Home" && label !== "About").map(({ href, label }) => (
            <Link key={href} href={href} className={linkClass}>
              {label}
            </Link>
          ))}
        </nav>

        <nav aria-label="Account" className="flex flex-col gap-2">
          <p className={headingClass}>Get started</p>
          {ACCOUNT_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className={linkClass}>
              {label}
            </Link>
          ))}
        </nav>
      </div>

      <p className="mx-auto max-w-[1440px] border-t border-white/10 px-4 py-5 text-sm text-white/60 sm:px-6 lg:px-12">
        &copy; {new Date().getFullYear()} EliteCadet. All rights reserved.
      </p>
    </footer>
  );
}
