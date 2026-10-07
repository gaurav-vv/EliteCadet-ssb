// Pure admin-access rules — no I/O, so the whole authorization surface is
// unit-testable (tests/unit/lib/admin-access.test.ts). Used by the middleware,
// by server pages/actions (defence in depth), and by the nav.

import type { AdminArea, AdminRequirement, GrantInput } from "@/types/admin";

export const ADMIN_AREAS: readonly AdminArea[] = ["super", "student_content", "mentor_content", "academy_content"];

export const ADMIN_AREA_LABELS: Record<AdminArea, string> = {
  super: "Super admin",
  student_content: "Student content",
  mentor_content: "Mentor content",
  academy_content: "Academy content",
};

export function isAdminArea(value: unknown): value is AdminArea {
  return typeof value === "string" && (ADMIN_AREAS as readonly string[]).includes(value);
}

// Route → requirement. Anchored on "/admin" so a future "/administration"
// can't inherit the guard by accident. Any /admin path this table does not
// name needs 'super', so a new page is closed until it is deliberately mapped.
export function adminRequirementForPath(pathname: string): AdminRequirement | null {
  if (pathname !== "/admin" && !pathname.startsWith("/admin/")) return null;
  if (pathname === "/admin") return "any";

  const section = pathname.split("/")[2];
  switch (section) {
    case "student-content":
      return "student_content";
    case "mentor-content":
      return "mentor_content";
    case "academy-content":
      return "academy_content";
    default:
      return "super";
  }
}

export function canAccess(grants: readonly AdminArea[], required: AdminRequirement): boolean {
  if (grants.includes("super")) return true;
  if (required === "any") return grants.length > 0;
  return grants.includes(required);
}

export type ParsedGrantInput = { ok: true; value: GrantInput } | { ok: false; message: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseGrantInput(input: { email?: unknown; area?: unknown }): ParsedGrantInput {
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  if (!EMAIL_PATTERN.test(email) || email.length > 254) return { ok: false, message: "Enter a valid email address." };
  if (!isAdminArea(input.area)) return { ok: false, message: "Choose an area to grant access to." };
  return { ok: true, value: { email, area: input.area } };
}
