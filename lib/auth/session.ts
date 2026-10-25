import { cache } from "react";
import { describeLookupFailure, lookupFailure } from "@/lib/auth/account";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/auth";

// `profileError` is true when the profile query itself failed (database
// unreachable, or a column this code expects is missing because a migration
// hasn't been applied) — distinct from `profile: null` with no error, which
// means the account genuinely has no profile row.
// Memoised per request with React `cache()`: a layout, its page and the role guard all
// ask for the signed-in user, which used to cost two Supabase round trips (auth +
// profile) each time. The memo lives only for one render and is never shared
// between requests or users. A change to the profile made by a *different* request
// (e.g. the name form) is seen on the next request, as before.
export const getCurrentUserAndProfile = cache(async function getCurrentUserAndProfile(): Promise<{
  user: { id: string; email: string | null } | null;
  profile: Profile | null;
  profileError: boolean;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null, profileError: false };
  }

  const {
    data: profile,
    error,
    status,
  } = await supabase.from("profiles").select("id, role, full_name, academy_id, status").eq("id", user.id).maybeSingle();

  if (error) {
    console.error(`[auth] profile lookup failed: ${describeLookupFailure("session", lookupFailure(error, status))}`);
  }

  return {
    user: { id: user.id, email: user.email ?? null },
    profileError: Boolean(error),
    profile: profile
      ? { id: profile.id, role: profile.role, fullName: profile.full_name, academyId: profile.academy_id, status: profile.status ?? "active" }
      : null,
  };
});

// The real academy name (Postgres `academies.name`, created at signup by the
// handle_new_user trigger) — used only where a page needs to show the
// signed-in user's actual academy, distinct from the shared demo/mock
// academy data most of the Academy Admin dashboard still reads from
// (status.md → Technical Debt).
export const getCurrentAcademyName = cache(async function getCurrentAcademyName(academyId: string | null): Promise<string | null> {
  if (!academyId) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("academies").select("name").eq("id", academyId).single();
  return data?.name ?? null;
});
