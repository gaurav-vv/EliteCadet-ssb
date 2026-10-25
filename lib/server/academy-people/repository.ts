// Academy people data access. Runs as the signed-in user's own session (anon
// key + RLS); every query is also filtered by the caller's academy id. The
// service-role client is used ONLY to send an invite email (inviteByEmail),
// which the anon key cannot do.

import { AdminClientConfigError, createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sanitizeSearch } from "@/lib/server/users/validation";
import { STUDENT_PAGE_SIZE } from "@/lib/server/academy-people/validation";
import type { DbResult } from "@/lib/server/users/repository";
import type { AcademyMentorRecord, AcademyStudentListParams, AcademyStudentRecord, AcademyStudentSummary } from "@/types/academy-people";
import type { ExistingAccount, MentorAuthState } from "@/lib/server/academy-people/validation";

const STUDENT_COLUMNS = "id, full_name, email, status, batch_id, batch_name, last_login_at, created_at";

export function toStudent(row: unknown): AcademyStudentRecord | null {
  if (typeof row !== "object" || row === null) return null;
  const r = row as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.created_at !== "string") return null;
  return {
    id: r.id,
    fullName: typeof r.full_name === "string" ? r.full_name : "",
    email: typeof r.email === "string" ? r.email : null,
    status: r.status === "suspended" ? "suspended" : "active",
    batchId: typeof r.batch_id === "string" ? r.batch_id : null,
    batchName: typeof r.batch_name === "string" ? r.batch_name : null,
    lastLoginAt: typeof r.last_login_at === "string" ? r.last_login_at : null,
    createdAt: r.created_at,
  };
}

export async function findStudents(academyId: string, params: AcademyStudentListParams, page: number, batchIds?: string[]): Promise<DbResult<{ rows: AcademyStudentRecord[]; total: number }>> {
  const supabase = await createClient();
  let query = supabase.from("academy_students").select(STUDENT_COLUMNS, { count: "exact" }).eq("academy_id", academyId);
  if (batchIds) query = query.in("batch_id", batchIds.length > 0 ? batchIds : ["00000000-0000-0000-0000-000000000000"]);
  if (params.batch === "none") query = query.is("batch_id", null);
  else if (params.batch !== "all") query = query.eq("batch_id", params.batch);
  if (params.status !== "all") query = query.eq("status", params.status);
  const q = sanitizeSearch(params.q);
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
  if (params.sort === "newest") query = query.order("created_at", { ascending: false });
  else if (params.sort === "oldest") query = query.order("created_at", { ascending: true });
  else if (params.sort === "last_login") query = query.order("last_login_at", { ascending: false, nullsFirst: false });
  else query = query.order("full_name", { ascending: true });
  const from = (page - 1) * STUDENT_PAGE_SIZE;
  const { data, count, error } = await query.order("id", { ascending: true }).range(from, from + STUDENT_PAGE_SIZE - 1);
  if (error) return { data: null, error };
  return { data: { rows: (data ?? []).map(toStudent).filter((s): s is AcademyStudentRecord => s !== null), total: count ?? 0 }, error: null };
}

export async function countStudents(academyId: string): Promise<DbResult<AcademyStudentSummary>> {
  const supabase = await createClient();
  const base = () => supabase.from("academy_students").select("id", { count: "exact", head: true }).eq("academy_id", academyId);
  const [total, without, suspended] = await Promise.all([base(), base().is("batch_id", null), base().eq("status", "suspended")]);
  const failed = total.error ?? without.error ?? suspended.error;
  if (failed) return { data: null, error: failed };
  const t = total.count ?? 0;
  const w = without.count ?? 0;
  return { data: { total: t, withoutBatch: w, inBatch: t - w, suspended: suspended.count ?? 0 }, error: null };
}

export async function findStudent(academyId: string, id: string): Promise<DbResult<AcademyStudentRecord | null>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("academy_students").select(STUDENT_COLUMNS).eq("academy_id", academyId).eq("id", id).maybeSingle();
  if (error) return { data: null, error };
  return { data: data ? toStudent(data) : null, error: null };
}

export async function findBatchMentors(batchId: string): Promise<DbResult<{ id: string; name: string }[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("batch_overview").select("mentors").eq("id", batchId).maybeSingle();
  if (error) return { data: null, error };
  const list = Array.isArray(data?.mentors) ? data.mentors : [];
  return {
    data: list.flatMap((m: unknown) => {
      const o = typeof m === "object" && m !== null ? (m as Record<string, unknown>) : {};
      return typeof o.id === "string" ? [{ id: o.id, name: typeof o.name === "string" && o.name ? o.name : "Unnamed mentor" }] : [];
    }),
    error: null,
  };
}

export async function addExistingStudent(email: string): Promise<DbResult<{ id: string; fullName: string }>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("academy_add_student", { p_email: email });
  if (error) return { data: null, error };
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row.id !== "string") return { data: null, error: { code: "P0002" } };
  return { data: { id: row.id, fullName: typeof row.full_name === "string" ? row.full_name : "" }, error: null };
}

export async function removeStudent(id: string): Promise<DbResult<null>> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("academy_remove_student", { p_student: id });
  return error ? { data: null, error } : { data: null, error: null };
}

// Service role, server-side only: the signup trigger (0007) trusts role +
// academy_id from an INVITE (invited_at is set), never from a browser signup.
// academyId null = an independent mentor (super admin invites only).
export async function inviteByEmail(input: { email: string; fullName: string; role: "student" | "mentor"; academyId: string | null; redirectTo: string }): Promise<DbResult<{ id: string }>> {
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (error) {
    if (!(error instanceof AdminClientConfigError)) throw error;
    console.error("[invite] admin client unavailable", { missing: error.missing });
    return { data: null, error: { code: "admin_unavailable", message: error.message } };
  }
  const { data, error } = await admin.auth.admin.inviteUserByEmail(input.email, {
    data: input.academyId ? { full_name: input.fullName, role: input.role, academy_id: input.academyId } : { full_name: input.fullName, role: input.role },
    redirectTo: input.redirectTo,
  });
  if (error || !data.user) {
    // Safe diagnostic: code and HTTP status only — never the address or a token.
    console.error(`[invite] auth invite failed: code=${(error as { code?: string } | null)?.code ?? "none"} status=${(error as { status?: number } | null)?.status ?? "none"}`);
    return { data: null, error: { code: (error as { code?: string } | null)?.code ?? "invite_failed", message: error?.message } };
  }
  return { data: { id: data.user.id }, error: null };
}

// Service role, server-side only, after the caller was authorized: the account
// (if any) that already uses this email, and whether its invite is still
// unaccepted. Used to decide invite / re-send / refuse (decideInvite).
export async function findAccountByEmail(email: string): Promise<DbResult<ExistingAccount | null>> {
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (error) {
    if (!(error instanceof AdminClientConfigError)) throw error;
    return { data: null, error: { code: "admin_unavailable", message: error.message } };
  }
  // Exact match on the normalized (lower-case) address — never ilike, where
  // "_" and "%" are wildcards ("a_b@x.co" would also match "axb@x.co").
  // Supabase Auth stores emails lower-case; if a mixed-case row ever slipped
  // through, Auth's own duplicate check still refuses the account (email_exists).
  const { data: profile, error } = await admin.from("profiles").select("id, role, academy_id").eq("email", email.trim().toLowerCase()).maybeSingle();
  if (error) return { data: null, error };
  if (!profile) return { data: null, error: null };
  const { data: auth, error: authError } = await admin.auth.admin.getUserById(profile.id as string);
  if (authError || !auth.user) return { data: null, error: { code: "lookup_failed", message: authError?.message } };
  const u = auth.user;
  return {
    data: {
      id: profile.id as string,
      role: String(profile.role),
      academyId: (profile.academy_id as string | null) ?? null,
      pending: !u.email_confirmed_at && !u.last_sign_in_at,
      invitedAt: u.invited_at ?? null,
    },
    error: null,
  };
}

export async function findMentors(academyId: string): Promise<DbResult<AcademyMentorRecord[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, status, last_login_at, batch_mentors!batch_mentors_mentor_id_fkey(batch:batches(id, name))")
    .eq("academy_id", academyId)
    .eq("role", "mentor")
    .order("full_name", { ascending: true })
    .limit(500);
  if (error) return { data: null, error };
  const rows = (data ?? []).flatMap((row): AcademyMentorRecord[] => {
    const r = row as Record<string, unknown>;
    if (typeof r.id !== "string") return [];
    const links = Array.isArray(r.batch_mentors) ? r.batch_mentors : [];
    const batches = links.flatMap((l: unknown) => {
      const link = typeof l === "object" && l !== null ? (l as Record<string, unknown>) : {};
      const b = Array.isArray(link.batch) ? link.batch[0] : link.batch;
      const o = typeof b === "object" && b !== null ? (b as Record<string, unknown>) : {};
      return typeof o.id === "string" && typeof o.name === "string" ? [{ id: o.id, name: o.name }] : [];
    });
    return [
      {
        id: r.id,
        fullName: typeof r.full_name === "string" ? r.full_name : "",
        email: typeof r.email === "string" ? r.email : null,
        status: r.status === "suspended" ? "suspended" : "active",
        invited: typeof r.last_login_at !== "string",
        access: r.status === "suspended" ? "suspended" : typeof r.last_login_at === "string" ? "active" : "invited",
        inviteSentAt: null,
        qualifications: null,
        specialization: [],
        lastLoginAt: typeof r.last_login_at === "string" ? r.last_login_at : null,
        batches,
      },
    ];
  });
  return { data: rows, error: null };
}

// The mentor's own batch ids (RLS: a mentor reads only their own rows).
export async function findMyBatchIds(mentorId: string): Promise<DbResult<{ id: string; name: string }[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("batch_mentors").select("batch:batches(id, name)").eq("mentor_id", mentorId);
  if (error) return { data: null, error };
  return {
    data: (data ?? []).flatMap((row) => {
      const b = Array.isArray(row.batch) ? row.batch[0] : row.batch;
      const o = typeof b === "object" && b !== null ? (b as Record<string, unknown>) : {};
      return typeof o.id === "string" && typeof o.name === "string" ? [{ id: o.id, name: o.name }] : [];
    }),
    error: null,
  };
}

// ---- Add mentor (manual + invite lifecycle) ----------------------------------
// Service role, server-side only, and only AFTER the service checked that the
// caller is an active admin of `academyId` and (for an existing mentor) that
// the mentor belongs to that academy.

type Admin = ReturnType<typeof createAdminClient>;

function adminClient(): { client: Admin; error: null } | { client: null; error: { code: string; message: string } } {
  try {
    return { client: createAdminClient(), error: null };
  } catch (error) {
    if (!(error instanceof AdminClientConfigError)) throw error;
    return { client: null, error: { code: "admin_unavailable", message: error.message } };
  }
}

// A mentor account with NO password and an unconfirmed email: the profile
// exists (and can be put on batches), but nobody can sign in as it until the
// owner of the email accepts an invite or a reset link and picks a password.
// app_metadata is service-role-only, so the role and academy are trusted
// (handle_new_user / apply_trusted_role, 0007 + 0015). No email is sent.
export async function createMentorAccount(input: { email: string; fullName: string; academyId: string }): Promise<DbResult<{ id: string }>> {
  const admin = adminClient();
  if (!admin.client) return { data: null, error: admin.error };
  const { data, error } = await admin.client.auth.admin.createUser({
    email: input.email,
    email_confirm: false,
    user_metadata: { full_name: input.fullName },
    app_metadata: { role: "mentor", academy_id: input.academyId },
  });
  if (error || !data.user) {
    console.error(`[mentor] create account failed: code=${(error as { code?: string } | null)?.code ?? "none"} status=${(error as { status?: number } | null)?.status ?? "none"}`);
    return { data: null, error: { code: (error as { code?: string } | null)?.code ?? "create_failed", message: error?.message } };
  }
  return { data: { id: data.user.id }, error: null };
}

export async function saveMentorDetails(id: string, details: { phone: string | null; qualifications: string | null; specialization: string[] }): Promise<DbResult<null>> {
  const admin = adminClient();
  if (!admin.client) return { data: null, error: admin.error };
  const phone = await admin.client.from("profiles").update({ phone: details.phone }).eq("id", id).eq("role", "mentor");
  if (phone.error) return { data: null, error: phone.error };
  const extra = await admin.client
    .from("mentor_profiles")
    .upsert({ user_id: id, qualifications: details.qualifications, expertise: details.specialization }, { onConflict: "user_id" });
  return extra.error ? { data: null, error: extra.error } : { data: null, error: null };
}

// Deleting a never-activated account is how an invite is revoked: the link
// can't be used once its user is gone. The profile rows cascade.
export async function deleteAccount(id: string): Promise<DbResult<null>> {
  const admin = adminClient();
  if (!admin.client) return { data: null, error: admin.error };
  const { error } = await admin.client.auth.admin.deleteUser(id);
  if (error) {
    console.error(`[mentor] delete account failed: code=${(error as { code?: string }).code ?? "none"} status=${(error as { status?: number }).status ?? "none"}`);
    return { data: null, error: { code: (error as { code?: string }).code ?? "delete_failed", message: error.message } };
  }
  return { data: null, error: null };
}

// Invite / activation state from Supabase Auth for the given accounts.
// Null when the service key isn't configured (callers degrade gracefully).
export async function findAuthStates(ids: string[]): Promise<Map<string, MentorAuthState> | null> {
  if (ids.length === 0) return new Map();
  const admin = adminClient();
  if (!admin.client) return null;
  const client = admin.client;
  const states = new Map<string, MentorAuthState>();
  await Promise.all(
    ids.slice(0, 100).map(async (id) => {
      const { data } = await client.auth.admin.getUserById(id);
      const u = data?.user as (typeof data.user & { confirmation_sent_at?: string | null }) | null | undefined;
      if (u) states.set(id, { invitedAt: u.invited_at ?? null, sentAt: u.confirmation_sent_at ?? null, confirmedAt: u.email_confirmed_at ?? null, lastSignInAt: u.last_sign_in_at ?? null });
    }),
  );
  return states;
}

// Phone, qualifications and specialization (RLS: 0027 lets the academy's
// admin read their mentors' mentor_profiles). Null if unavailable, e.g. before
// 0027 is applied, so the mentor list still loads without the details.
export async function findMentorDetails(ids: string[]): Promise<Map<string, { qualifications: string | null; specialization: string[] }> | null> {
  if (ids.length === 0) return new Map();
  const supabase = await createClient();
  const { data, error } = await supabase.from("mentor_profiles").select("user_id, qualifications, expertise").in("user_id", ids);
  if (error) {
    console.error(`[mentor] details unavailable: code=${error.code ?? "none"}`);
    return null;
  }
  return new Map(
    (data ?? []).map((r) => [
      String(r.user_id),
      { qualifications: typeof r.qualifications === "string" ? r.qualifications : null, specialization: Array.isArray(r.expertise) ? r.expertise.filter((x): x is string => typeof x === "string") : [] },
    ]),
  );
}

// One mentor of this academy, read with the admin's own session (RLS).
export async function findAcademyMentor(academyId: string, id: string): Promise<DbResult<{ id: string; email: string | null; fullName: string; status: "active" | "suspended"; lastLoginAt: string | null } | null>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("id, email, full_name, status, last_login_at").eq("academy_id", academyId).eq("role", "mentor").eq("id", id).maybeSingle();
  if (error) return { data: null, error };
  if (!data) return { data: null, error: null };
  return {
    data: {
      id: String(data.id),
      email: typeof data.email === "string" ? data.email : null,
      fullName: typeof data.full_name === "string" ? data.full_name : "",
      status: data.status === "suspended" ? "suspended" : "active",
      lastLoginAt: typeof data.last_login_at === "string" ? data.last_login_at : null,
    },
    error: null,
  };
}

// audit_log only accepts inserts from super admins under RLS, so academy
// admins' mentor events are written with the service role, actor = the admin.
export async function auditAsService(entry: { actorId: string; action: string; targetId: string; details: Record<string, unknown> }): Promise<void> {
  const admin = adminClient();
  if (!admin.client) return;
  const { error } = await admin.client.from("audit_log").insert({ actor_id: entry.actorId, action: entry.action, target_type: "user", target_id: entry.targetId, details: entry.details });
  if (error) console.error(`[mentor] audit write failed: code=${error.code ?? "none"}`);
}
