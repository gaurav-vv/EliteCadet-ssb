import type { NavIconName } from "@/components/ui/nav-icons";

// One nav item shape for every workspace sidebar (Student, Mentor, Academy,
// Super Admin) and its mobile drawer.
export interface WorkspaceNavItem {
  label: string;
  href: string;
  icon: NavIconName;
  // "soon" items are rendered but disabled until their feature ships — add
  // the page, then flip this to "available" (no other change needed).
  availability: "available" | "soon";
}

// The first item is the workspace root: it is active only on an exact match,
// so "/student" isn't highlighted while on "/student/practice".
export function isWorkspaceNavActive(pathname: string, href: string, rootHref: string): boolean {
  if (href === rootHref) return pathname === rootHref;
  return pathname === href || pathname.startsWith(`${href}/`);
}
