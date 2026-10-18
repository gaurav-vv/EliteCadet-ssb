// Public site navigation. Section links point at anchors on the landing page
// (app/(public)/page.tsx), so they work from every public page.
export const SITE_NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/#students", label: "Students" },
  { href: "/#mentors", label: "Mentors" },
  { href: "/#academics", label: "Academics" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/#about", label: "About" },
] as const;
