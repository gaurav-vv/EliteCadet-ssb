// Server-side authorization guards (AGENTS.md §10). Server-only: imports the
// cookie-bound Supabase client. The middleware already checks the route's
// role; pages and actions re-check here so no single layer is trusted alone.

import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/auth/session";
import { can, type Permission } from "@/lib/server/permissions/rbac";
import type { Profile, Role } from "@/types/auth";

export interface Actor {
  id: string;
  email: string | null;
  profile: Profile;
}

// The signed-in, active account, or null.
export async function getActor(): Promise<Actor | null> {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile || profile.status !== "active") return null;
  return { id: user.id, email: user.email, profile };
}

// For pages and layouts: redirects instead of rendering anything.
export async function requireRole(role: Role): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect("/login?reason=login_required");
  if (actor.profile.role !== role) redirect("/forbidden");
  return actor;
}

export type GuardFailure = { ok: false; error: { code: "unauthorized"; message: string } };

// For Server Actions (callable from any page by id): returns a typed failure
// instead of redirecting, so the caller can show a message.
export async function authorize(permission: Permission): Promise<Actor | GuardFailure> {
  const actor = await getActor();
  if (!actor || !can(actor.profile.role, permission)) {
    return { ok: false, error: { code: "unauthorized", message: "You don't have permission to do that." } };
  }
  return actor;
}

export function isGuardFailure(value: Actor | GuardFailure): value is GuardFailure {
  return "ok" in value;
}
