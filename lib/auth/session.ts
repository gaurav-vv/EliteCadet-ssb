import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/auth";

export async function getCurrentUserAndProfile(): Promise<{ user: { id: string; email: string | null } | null; profile: Profile | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, academy_id")
    .eq("id", user.id)
    .single();

  return {
    user: { id: user.id, email: user.email ?? null },
    profile: profile
      ? { id: profile.id, role: profile.role, fullName: profile.full_name, academyId: profile.academy_id }
      : null,
  };
}

// The real academy name (Postgres `academies.name`, created at signup by the
// handle_new_user trigger) — used only where a page needs to show the
// signed-in user's actual academy, distinct from the shared demo/mock
// academy data most of the Academy Admin dashboard still reads from
// (status.md → Technical Debt).
export async function getCurrentAcademyName(academyId: string | null): Promise<string | null> {
  if (!academyId) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("academies").select("name").eq("id", academyId).single();
  return data?.name ?? null;
}
