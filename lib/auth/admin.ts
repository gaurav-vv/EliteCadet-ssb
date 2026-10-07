import { redirect } from "next/navigation";
import { canAccess, isAdminArea } from "@/lib/admin/access";
import { createClient } from "@/lib/supabase/server";
import type { AdminArea, AdminRequirement } from "@/types/admin";

// The signed-in user's admin grants (RLS lets a user read only their own),
// or null when nobody is signed in.
export async function getAdminGrants(): Promise<{ userId: string; grants: AdminArea[] } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("admin_grants").select("area").eq("user_id", user.id);
  return { userId: user.id, grants: (data ?? []).map((r) => r.area).filter(isAdminArea) };
}

// Second line of defence behind the middleware (AGENTS.md §10): every /admin
// page and action re-checks on the server rather than trusting the route guard.
export async function requireAdminArea(required: AdminRequirement): Promise<{ userId: string; grants: AdminArea[] }> {
  const session = await getAdminGrants();
  if (!session) redirect("/login");
  if (!canAccess(session.grants, required)) redirect("/forbidden");
  return session;
}
