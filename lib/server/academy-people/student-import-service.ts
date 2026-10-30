// Bulk student import (server side). Two entry points, both for an academy admin only:
//
//  * previewStudentImport: what each email would become (new invite / joins / already a member /
//    blocked), using the real accounts. Creates nothing.
//  * importStudentChunk: creates the students of one small chunk.
//
// Rules that make this safe:
//  * The academy is ALWAYS the signed-in admin's. A request or a CSV cannot name one, and a role cannot
//    be supplied: only { row, email, fullName } is read from each row, everything else is ignored.
//  * Every row is validated again here. The browser's preview is a convenience, never a decision.
//  * Creation goes through addAcademyStudent, the same code as the Add student form (existing accounts
//    join through the academy_add_student function; everyone else gets an invitation e-mail, so every
//    student can sign in the normal way).
//  * Students who already belong to this academy are skipped, so retrying a file, or a chunk whose
//    response was lost, never creates a second account, a second invite or a second email.
//  * Chunks are small and the work inside one is sequential: an email rate limit stops the chunk and the
//    rest is reported as "not processed" instead of being hammered.
//  * Nothing is logged: no emails, names or passwords.

import { getActor } from "@/lib/server/auth/guard";
import * as repo from "@/lib/server/academy-people/repository";
import { addAcademyStudent, EMAIL_RATE_LIMIT_MESSAGE, INVITE_UNAVAILABLE } from "@/lib/server/academy-people/service";
import {
  IMPORT_CHUNK_SIZE,
  IMPORT_PREVIEW_CHUNK_SIZE,
  normalizeImportRow,
  rowIssues,
  type ImportResultRow,
  type ImportRow,
  type ImportStop,
  type PreviewRow,
} from "@/lib/server/academy-people/student-import";
import type { ServiceResult } from "@/lib/server/users/service";

const fail = <T>(code: "validation_error" | "unauthorized" | "not_set_up" | "server_error", message: string): ServiceResult<T> => ({ ok: false, error: { code, message } });
const ADMIN_ONLY = "Only an academy admin can import students.";
const BAD_REQUEST = "That request wasn't understood. Reload the page and try again.";

async function academyAdmin(): Promise<{ academyId: string } | null> {
  const actor = await getActor();
  if (!actor || actor.profile.role !== "academy_admin" || !actor.profile.academyId) return null;
  return { academyId: actor.profile.academyId };
}

// Reads { row, email, fullName } from untrusted input and nothing else (no academy, role or other field).
function readRows(input: unknown, max: number): ImportRow[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > max) return null;
  const rows: ImportRow[] = [];
  for (const item of input) {
    if (typeof item !== "object" || item === null) return null;
    const r = item as Record<string, unknown>;
    if (typeof r.row !== "number" || !Number.isInteger(r.row) || r.row < 2 || r.row > 100_000) return null;
    if (typeof r.email !== "string" || typeof r.fullName !== "string" || r.email.length > 320 || r.fullName.length > 200) return null;
    rows.push({ row: r.row, email: r.email, fullName: r.fullName, ...(r.extraCells === true ? { extraCells: true } : {}) });
  }
  return rows;
}

// ---- Preview -------------------------------------------------------------------------------------

async function inPools<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  return out;
}

export async function previewStudentImport(input: unknown): Promise<ServiceResult<{ rows: PreviewRow[] }>> {
  const admin = await academyAdmin();
  if (!admin) return fail("unauthorized", ADMIN_ONLY);
  const rows = readRows(input, IMPORT_PREVIEW_CHUNK_SIZE);
  if (!rows) return fail("validation_error", BAD_REQUEST);

  const rowsOut = await inPools(rows, 5, async (row): Promise<PreviewRow> => {
    if (rowIssues(row).length > 0) return { row: row.row, outcome: "unknown", message: "Fix this row first." };
    const { email } = normalizeImportRow(row);
    const found = await repo.findAccountByEmail(email);
    if (found.error) return { row: row.row, outcome: "unknown", message: found.error.code === "admin_unavailable" ? "Existing accounts can't be checked here; this row is checked when you import." : "Couldn't check this email right now; it is checked again when you import." };
    const account = found.data;
    if (!account) return { row: row.row, outcome: "new", message: "New student: an invitation email will be sent." };
    if (account.role !== "student") return { row: row.row, outcome: "blocked", message: "That account isn't a student account." };
    if (account.academyId === admin.academyId) return { row: row.row, outcome: "member", message: "Already a student of your academy; will be skipped." };
    if (account.academyId) return { row: row.row, outcome: "blocked", message: "That student already belongs to another academy." };
    return { row: row.row, outcome: "join", message: "Has an account: will join your academy." };
  });
  return { ok: true, data: { rows: rowsOut } };
}

// ---- Import --------------------------------------------------------------------------------------

export async function importStudentChunk(input: unknown, origin: string): Promise<ServiceResult<{ rows: ImportResultRow[]; stopped: ImportStop | null }>> {
  const admin = await academyAdmin();
  if (!admin) return fail("unauthorized", ADMIN_ONLY);
  const rows = readRows(input, IMPORT_CHUNK_SIZE);
  if (!rows) return fail("validation_error", BAD_REQUEST);

  // Who is already in this academy (RLS-scoped, so it can only see this academy).
  const normalized = rows.map((r) => ({ row: r, ...normalizeImportRow(r) }));
  const members = await repo.findMemberEmails(admin.academyId, [...new Set(normalized.map((n) => n.email).filter(Boolean))]);
  if (members.error) return fail("server_error", "We couldn't check your current students, so nothing was imported. Please try again.");

  const out: ImportResultRow[] = [];
  const seen = new Set<string>();
  let stopped: ImportStop | null = null;

  for (const { row, email, fullName } of normalized) {
    const base = { row: row.row, email: email || row.email.trim(), fullName: fullName || row.fullName.trim() };
    if (stopped) {
      out.push({ ...base, result: "not_processed", message: stopped === "email_limit" ? "Not processed: the email service asked us to slow down. Upload the file again later; students already added are skipped." : "Not processed: invitations aren't set up on this server." });
      continue;
    }
    const issues = rowIssues(row);
    if (issues.length > 0) {
      out.push({ ...base, result: "failed", message: issues.join(" ") });
      continue;
    }
    if (seen.has(email)) {
      out.push({ ...base, result: "skipped", message: "Same email as an earlier row; skipped." });
      continue;
    }
    seen.add(email);
    if (members.data.has(email)) {
      out.push({ ...base, result: "skipped", message: "Already a student of your academy; skipped." });
      continue;
    }

    const added = await addAcademyStudent({ email, fullName }, origin);
    if (added.ok && added.data) {
      out.push({ ...base, result: added.data.invited ? "invited" : "joined", message: added.data.invited ? "Added; invitation email sent." : "Added; the existing account joined your academy." });
      continue;
    }
    const message = added.error?.message ?? "We couldn't add this student.";
    if (added.error?.code === "not_set_up") {
      stopped = "not_set_up";
      out.push({ ...base, result: "failed", message: message || INVITE_UNAVAILABLE });
    } else if (message === EMAIL_RATE_LIMIT_MESSAGE) {
      stopped = "email_limit";
      out.push({ ...base, result: "failed", message: "The email service asked us to slow down, so this invitation wasn't sent." });
    } else if (added.error?.code === "unauthorized") {
      return fail("unauthorized", ADMIN_ONLY);
    } else {
      out.push({ ...base, result: "failed", message });
    }
  }
  return { ok: true, data: { rows: out, stopped } };
}
