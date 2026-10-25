// Academy people (students / mentors) input parsing — pure
// (tests/unit/lib/academy-people-validation.test.ts).

import { isUuid } from "@/lib/server/users/validation";
import type { AcademyStudentListParams, StudentSortOption, StudentStatusFilter } from "@/types/academy-people";

export const STUDENT_PAGE_SIZE = 20;

export const DEFAULT_STUDENT_PARAMS: AcademyStudentListParams = { q: "", batch: "all", status: "all", sort: "name", page: 1 };

const STATUS: readonly StudentStatusFilter[] = ["all", "active", "suspended"];
const SORTS: readonly StudentSortOption[] = ["name", "newest", "oldest", "last_login"];

type RawParams = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? (v[0] ?? "") : (v ?? ""));

export function parseStudentParams(raw: RawParams): AcademyStudentListParams {
  const batch = first(raw.batch);
  const status = first(raw.status);
  const sort = first(raw.sort);
  const page = Number.parseInt(first(raw.page), 10);
  return {
    q: first(raw.q).trim().slice(0, 80),
    // "all", "none" or a UUID — anything else can't reach the database.
    batch: batch === "none" || isUuid(batch) ? batch : "all",
    status: (STATUS as readonly string[]).includes(status) ? (status as StudentStatusFilter) : "all",
    sort: (SORTS as readonly string[]).includes(sort) ? (sort as StudentSortOption) : "name",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export function buildStudentQuery(params: Partial<AcademyStudentListParams>): string {
  const merged = { ...DEFAULT_STUDENT_PARAMS, ...params };
  const search = new URLSearchParams();
  (Object.keys(DEFAULT_STUDENT_PARAMS) as (keyof AcademyStudentListParams)[]).forEach((key) => {
    if (merged[key] !== DEFAULT_STUDENT_PARAMS[key]) search.set(key, String(merged[key]));
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function buildStudentHref(params: Partial<AcademyStudentListParams>): string {
  return `/academy/students${buildStudentQuery(params)}`;
}

export function hasActiveStudentFilters(params: AcademyStudentListParams): boolean {
  return params.q !== "" || params.batch !== "all" || params.status !== "all";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type PersonInviteCheck = { ok: true; email: string; fullName: string } | { ok: false; field: "email" | "fullName"; message: string };

// Email always; a name only matters when we end up sending an invite.
export function checkPersonInput(input: { email?: unknown; fullName?: unknown }, needName: boolean): PersonInviteCheck {
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const fullName = typeof input.fullName === "string" ? input.fullName.trim().replace(/\s+/g, " ") : "";
  if (!EMAIL_RE.test(email) || email.length > 254) return { ok: false, field: "email", message: "Enter a valid email address." };
  if (needName && (fullName.length < 2 || fullName.length > 80)) return { ok: false, field: "fullName", message: "Enter their full name (2–80 characters)." };
  return { ok: true, email, fullName };
}

// An account that already uses the email being invited (service-role lookup).
export interface ExistingAccount {
  id: string;
  role: string;
  academyId: string | null;
  // Never activated: no confirmed email and never signed in. Covers invites
  // not yet accepted AND mentors added manually who were never invited.
  pending: boolean;
  // Null for an account that was never sent an invite (added manually).
  invitedAt: string | null;
}

export type InviteDecision = { kind: "invite" } | { kind: "resend" } | { kind: "refuse"; reason: "same_academy_active" | "other_account" };

// Supabase Auth only RE-SENDS an invite to an unaccepted account and never
// changes its role or academy, so inviting an existing address as a mentor
// used to "succeed" while the person stayed a student (or in another academy).
// Decide up front: invite, re-send the identical pending invite, or refuse.
export function decideInvite(existing: ExistingAccount | null, wanted: { role: "mentor" | "student"; academyId: string | null }): InviteDecision {
  if (!existing) return { kind: "invite" };
  const sameTarget = existing.role === wanted.role && existing.academyId === wanted.academyId;
  if (sameTarget && existing.pending) return { kind: "resend" };
  if (sameTarget) return { kind: "refuse", reason: "same_academy_active" };
  return { kind: "refuse", reason: "other_account" };
}

// ---- Add mentor manually ---------------------------------------------------

export type ManualMentorCheck =
  | { ok: true; email: string; fullName: string; phone: string | null; qualifications: string | null; specialization: string[] }
  | { ok: false; field: "email" | "fullName" | "phone" | "qualifications" | "specialization"; message: string };

const PHONE_RE = /^\+?[0-9 ()-]{7,20}$/;

// Same name/email rules as an invite, plus the optional profile details.
// Specialization is a comma-separated list stored in mentor_profiles.expertise.
export function checkManualMentorInput(input: { email?: unknown; fullName?: unknown; phone?: unknown; qualifications?: unknown; specialization?: unknown }): ManualMentorCheck {
  const person = checkPersonInput(input, true);
  if (!person.ok) return person;
  const text = (v: unknown) => (typeof v === "string" ? v.trim().replace(/[ \t]+/g, " ") : "");
  const phone = text(input.phone);
  if (phone && !PHONE_RE.test(phone)) return { ok: false, field: "phone", message: "Enter a phone number of 7–20 digits (spaces, +, - and brackets are fine), or leave it empty." };
  const qualifications = text(input.qualifications);
  if (qualifications.length > 500) return { ok: false, field: "qualifications", message: "Keep qualifications under 500 characters." };
  const specialization = [...new Set(text(input.specialization).split(",").map((s) => s.trim()).filter(Boolean))];
  if (specialization.length > 10 || specialization.some((s) => s.length > 60)) return { ok: false, field: "specialization", message: "Up to 10 specializations, each under 60 characters, separated by commas." };
  return { ok: true, email: person.email, fullName: person.fullName, phone: phone || null, qualifications: qualifications || null, specialization };
}

// ---- Mentor access status ----------------------------------------------------

// How long a Supabase invite link works. Must match the project's
// Authentication → Emails → "Email OTP Expiration" (Supabase's default, and
// supabase/config.toml's otp_expiry, is 3600 s). Supabase enforces the real
// expiry; this only labels the invite "expired" so the admin knows to resend.
export const INVITE_LINK_TTL_SECONDS = 3600;

export type MentorAccess =
  | "active" // has signed in / set a password
  | "not_invited" // added manually, no invite sent: profile only, can't log in
  | "invited" // invite sent, link still valid
  | "expired" // invite sent, link expired: resend
  | "suspended";

export interface MentorAuthState {
  invitedAt: string | null;
  // When the latest invite email was sent (re-sends update it).
  sentAt: string | null;
  confirmedAt: string | null;
  lastSignInAt: string | null;
}

// `auth` is null when the auth record couldn't be read (no service key):
// then a mentor who never signed in is shown as invited, as before.
export function mentorAccess(m: { status: "active" | "suspended"; lastLoginAt: string | null }, auth: MentorAuthState | null, nowMs: number): MentorAccess {
  if (m.status === "suspended") return "suspended";
  if (m.lastLoginAt || auth?.lastSignInAt || auth?.confirmedAt) return "active";
  if (!auth) return "invited";
  if (!auth.invitedAt) return "not_invited";
  const sent = Date.parse(auth.sentAt ?? auth.invitedAt);
  return Number.isFinite(sent) && nowMs - sent > INVITE_LINK_TTL_SECONDS * 1000 ? "expired" : "invited";
}

// Only an account nobody has activated can have its invite revoked (which
// deletes it); an activated mentor is suspended by the platform team instead.
export const canRevoke = (access: MentorAccess) => access === "not_invited" || access === "invited" || access === "expired";
