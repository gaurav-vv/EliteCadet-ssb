import type { Role } from "@/types/auth";

export function dashboardPathForRole(role: string): string {
  switch (role as Role) {
    case "mentor":
      return "/mentor";
    case "academy_admin":
      return "/academy";
    case "super_admin":
      return "/admin";
    case "student":
    default:
      return "/student";
  }
}
