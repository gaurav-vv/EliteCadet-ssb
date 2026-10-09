import type { WorkspaceNavItem } from "@/lib/navigation/workspace";

export type AcademyNavItem = WorkspaceNavItem;

// Single source of truth for the Academy sidebar and mobile drawer. Reorder,
// add or remove entries here only.
export const ACADEMY_NAVIGATION: AcademyNavItem[] = [
  { label: "Dashboard", href: "/academy", icon: "dashboard", availability: "available" },
  { label: "Students", href: "/academy/students", icon: "students", availability: "available" },
  { label: "Batches", href: "/academy/batches", icon: "batches", availability: "available" },
  { label: "Mentors", href: "/academy/mentors", icon: "mentors", availability: "available" },
  { label: "Assessments", href: "/academy/assessments", icon: "evaluations", availability: "soon" },
  { label: "Performance", href: "/academy/performance", icon: "performance", availability: "soon" },
  { label: "Sessions", href: "/academy/sessions", icon: "sessions", availability: "soon" },
  { label: "Activities", href: "/academy/activities", icon: "activities", availability: "soon" },
  { label: "Reports", href: "/academy/reports", icon: "reports", availability: "available" },
  { label: "Library", href: "/academy/library", icon: "content", availability: "available" },
  { label: "Notifications", href: "/academy/notifications", icon: "notifications", availability: "soon" },
  { label: "Settings", href: "/academy/settings", icon: "settings", availability: "available" },
];
