// Practice banks and saved practice (specs.md §8a.4g, T083b). Banks are read
// by any signed-in user and edited only by a super admin; answers and
// attempts belong to the student and are readable by their mentors. RLS
// (0014) enforces the same; every function here checks the role first.

import { randomBytes } from "node:crypto";
import { getMyMentee } from "@/lib/server/academy-people/service";
import { getActor, type Actor } from "@/lib/server/auth/guard";
import { cleanAnswerPatch, cleanAttemptAnswers, cleanMockReview, isClientKey, isKey, isSlug, streakDays, validateItemInput, type ItemFieldErrors } from "@/lib/server/practice/validation";
import { createClient } from "@/lib/supabase/server";
import { mapDbError, type ServiceResult } from "@/lib/server/users/service";
import { isUuid } from "@/lib/server/users/validation";
import type { AdminBankSummary, AdminPracticeItem, AttemptResult, BankProgress, MenteePracticeAnswer, MenteePracticeAttempt, MockAttemptRecord, PracticeBank, PracticeItemInput, PracticeItemKind, SavedPracticeAnswer } from "@/types/practice";
import type { GuidedPracticeItem, McqItem } from "@/types/ssb-journey";

type Code = "validation_error" | "not_found" | "unauthorized";
const fail = <T>(code: Code, message: string): ServiceResult<T> => ({ ok: false, error: { code, message } });
const NO_BANK = "That practice set isn't available.";
const ITEM_COLS = "id, key, position, prompt, options, correct_option_id, guidance, active";

async function student(): Promise<Actor | null> {
  const a = await getActor();
  return a && a.profile.role === "student" ? a : null;
}

async function superAdmin(): Promise<Actor | null> {
  const a = await getActor();
  return a && a.profile.role === "super_admin" ? a : null;
}

type Row = Record<string, unknown>;
const text = (v: unknown) => (typeof v === "string" ? v : "");

function toOptions(v: unknown): { id: string; label: string }[] | null {
  if (!Array.isArray(v)) return null;
  const out = v.flatMap((o) => (typeof o === "object" && o !== null && typeof (o as Row).id === "string" && typeof (o as Row).label === "string" ? [{ id: (o as Row).id as string, label: (o as Row).label as string }] : []));
  return out.length > 0 ? out : null;
}

function toGuidance(v: unknown): { assesses: string; tips: string[] } | null {
  if (typeof v !== "object" || v === null) return null;
  const r = v as Row;
  if (typeof r.assesses !== "string" || !Array.isArray(r.tips)) return null;
  return { assesses: r.assesses, tips: r.tips.filter((t): t is string => typeof t === "string") };
}

export function toStudentItem(row: Row, kind: PracticeItemKind, withAnswer: boolean): McqItem | GuidedPracticeItem | null {
  if (typeof row.key !== "string" || typeof row.prompt !== "string") return null;
  if (kind === "mcq") {
    const options = toOptions(row.options);
    if (!options) return null;
    return { id: row.key, prompt: row.prompt, options, ...(withAnswer && typeof row.correct_option_id === "string" ? { correctOptionId: row.correct_option_id } : {}) };
  }
  const guidance = toGuidance(row.guidance);
  return { id: row.key, prompt: row.prompt, ...(guidance ? { guidance } : {}) };
}

// ---- Reading banks ---------------------------------------------------------------

// `forTest`: a timed test never ships the correct options to the browser.
export async function getBank(slug: string, opts: { forTest?: boolean } = {}): Promise<ServiceResult<PracticeBank>> {
  const me = await getActor();
  if (!me) return fail("unauthorized", "Please sign in again.");
  if (!isSlug(slug)) return fail("not_found", NO_BANK);
  const supabase = await createClient();
  const [bank, items] = await Promise.all([
    supabase.from("practice_banks").select("slug, title, item_kind").eq("slug", slug).maybeSingle(),
    supabase.from("practice_items").select(ITEM_COLS).eq("bank_slug", slug).eq("active", true).order("position").limit(500),
  ]);
  const failed = bank.error ?? items.error;
  if (failed) return mapDbError(failed, "We couldn't load these questions. Please try again.");
  if (!bank.data) return fail("not_found", NO_BANK);
  const kind: PracticeItemKind = bank.data.item_kind === "mcq" ? "mcq" : "response";
  return {
    ok: true,
    data: {
      slug,
      title: text(bank.data.title),
      kind,
      items: ((items.data ?? []) as Row[]).map((r) => toStudentItem(r, kind, !opts.forTest)).filter((i): i is McqItem | GuidedPracticeItem => i !== null),
    },
  };
}

export async function getBankCounts(slugs: string[]): Promise<Record<string, number>> {
  const valid = slugs.filter(isSlug);
  if (valid.length === 0) return {};
  const supabase = await createClient();
  const { data } = await supabase.from("practice_items").select("bank_slug").in("bank_slug", valid).eq("active", true).limit(5000);
  const out: Record<string, number> = Object.fromEntries(valid.map((s) => [s, 0]));
  for (const r of (data ?? []) as Row[]) if (typeof r.bank_slug === "string") out[r.bank_slug] = (out[r.bank_slug] ?? 0) + 1;
  return out;
}

async function itemIdsByKey(slug: string): Promise<Map<string, string>> {
  const supabase = await createClient();
  const { data } = await supabase.from("practice_items").select("id, key").eq("bank_slug", slug).limit(500);
  return new Map(((data ?? []) as Row[]).map((r) => [r.key as string, r.id as string]));
}

// ---- Student: self-paced answers -----------------------------------------------------

export async function getMyAnswers(slug: string): Promise<ServiceResult<Record<string, SavedPracticeAnswer>>> {
  const me = await student();
  if (!me) return fail("unauthorized", "Only a student saves practice answers.");
  if (!isSlug(slug)) return fail("not_found", NO_BANK);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("practice_answers")
    .select("answer_text, selected_option_id, self_review, done, updated_at, item:practice_items!inner(key, bank_slug)")
    .eq("student_id", me.id)
    .eq("item.bank_slug", slug)
    .limit(500);
  if (error) return mapDbError(error, "We couldn't load your saved answers. Please try again.");
  const out: Record<string, SavedPracticeAnswer> = {};
  for (const r of (data ?? []) as Row[]) {
    const item = (Array.isArray(r.item) ? r.item[0] : r.item) as Row | undefined;
    if (!item || typeof item.key !== "string") continue;
    out[item.key] = {
      text: text(r.answer_text),
      optionId: typeof r.selected_option_id === "string" ? r.selected_option_id : null,
      selfReview: Array.isArray(r.self_review) ? (r.self_review as string[]) : [],
      done: r.done === true,
      updatedAt: text(r.updated_at),
    };
  }
  return { ok: true, data: out };
}

export async function saveMyAnswer(slug: string, key: string, rawPatch: unknown): Promise<ServiceResult<{ updatedAt: string }>> {
  const me = await student();
  if (!me) return fail("unauthorized", "Only a student saves practice answers.");
  if (!isSlug(slug) || !isKey(key)) return fail("not_found", "That question isn't available.");
  const patch = cleanAnswerPatch(rawPatch);
  if (!patch.ok) return fail("validation_error", patch.message);
  const supabase = await createClient();
  const { data: item, error: itemError } = await supabase.from("practice_items").select("id").eq("bank_slug", slug).eq("key", key).eq("active", true).maybeSingle();
  if (itemError) return mapDbError(itemError, "We couldn't save that. Please try again.");
  if (!item) return fail("not_found", "That question isn't available.");
  const row: Row = { student_id: me.id, item_id: item.id };
  if (patch.value.text !== undefined) row.answer_text = patch.value.text;
  if (patch.value.optionId !== undefined) row.selected_option_id = patch.value.optionId;
  if (patch.value.selfReview !== undefined) row.self_review = patch.value.selfReview;
  if (patch.value.done !== undefined) row.done = patch.value.done;
  const { data, error } = await supabase.from("practice_answers").upsert(row, { onConflict: "student_id,item_id" }).select("updated_at").single();
  if (error) return mapDbError(error, "We couldn't save that. Please try again.");
  return { ok: true, data: { updatedAt: text(data?.updated_at) } };
}

// Done counts per bank (active items only) for the caller.
export async function getMyBankProgress(slugs: string[]): Promise<ServiceResult<Record<string, BankProgress>>> {
  const me = await student();
  if (!me) return fail("unauthorized", "Only a student has practice progress.");
  const valid = slugs.filter(isSlug);
  if (valid.length === 0) return { ok: true, data: {} };
  const supabase = await createClient();
  const [items, done] = await Promise.all([
    supabase.from("practice_items").select("id, bank_slug").in("bank_slug", valid).eq("active", true).limit(5000),
    supabase.from("practice_answers").select("item_id").eq("student_id", me.id).eq("done", true).limit(5000),
  ]);
  const failed = items.error ?? done.error;
  if (failed) return mapDbError(failed, "We couldn't load your progress. Please try again.");
  const doneIds = new Set(((done.data ?? []) as Row[]).map((r) => r.item_id as string));
  const out: Record<string, BankProgress> = Object.fromEntries(valid.map((s) => [s, { done: 0, total: 0 }]));
  for (const r of (items.data ?? []) as Row[]) {
    const p = out[r.bank_slug as string];
    if (!p) continue;
    p.total += 1;
    if (doneIds.has(r.id as string)) p.done += 1;
  }
  return { ok: true, data: out };
}

export async function getMyStreak(nowIso: string): Promise<number> {
  const me = await student();
  if (!me) return 0;
  const since = new Date(Date.parse(nowIso) - 60 * 86_400_000).toISOString();
  const supabase = await createClient();
  const [answers, attempts] = await Promise.all([
    supabase.from("practice_answers").select("updated_at").eq("student_id", me.id).eq("done", true).gte("updated_at", since).limit(2000),
    supabase.from("practice_attempts").select("submitted_at").eq("student_id", me.id).gte("submitted_at", since).limit(2000),
  ]);
  const times = [...((answers.data ?? []) as Row[]).map((r) => text(r.updated_at)), ...((attempts.data ?? []) as Row[]).map((r) => text(r.submitted_at))].filter(Boolean);
  return streakDays(times, nowIso);
}

// ---- Student: timed tests and mock runs ----------------------------------------------------

export async function submitMyAttempt(slug: string, mode: "test" | "mock", clientKey: string, rawAnswers: unknown): Promise<ServiceResult<AttemptResult>> {
  const me = await student();
  if (!me) return fail("unauthorized", "Only a student can submit practice.");
  if (!isSlug(slug)) return fail("not_found", NO_BANK);
  if (!isClientKey(clientKey)) return fail("validation_error", "Please try submitting again.");
  const answers = cleanAttemptAnswers(rawAnswers, mode === "mock");
  if (!answers) return fail("validation_error", "There's nothing to submit yet.");
  const ids = await itemIdsByKey(slug);
  const rows: Row[] = [];
  for (const a of answers) {
    if (a.key === undefined) {
      rows.push({ prompt: a.prompt, response: a.response ?? "" });
      continue;
    }
    const itemId = ids.get(a.key);
    if (!itemId) return fail("validation_error", "Some questions changed while you were answering. Please reload and try again.");
    rows.push({ itemId, ...(a.response !== undefined ? { response: a.response } : {}), ...(a.optionId !== undefined ? { optionId: a.optionId } : {}) });
  }
  const supabase = await createClient();
  const cols = "id, correct, total, submitted_at";
  const { data, error } = await supabase.from("practice_attempts").insert({ student_id: me.id, bank_slug: slug, mode, client_key: clientKey, answers: rows }).select(cols).single();
  if (error?.code === "23505") {
    // Same run submitted again (a retry): return the original, never a duplicate.
    const again = await supabase.from("practice_attempts").select(cols).eq("student_id", me.id).eq("client_key", clientKey).maybeSingle();
    if (again.data) return { ok: true, data: { id: again.data.id, correct: again.data.correct ?? null, total: again.data.total ?? 0, submittedAt: text(again.data.submitted_at) } };
  }
  if (error) return mapDbError(error, "We couldn't submit your practice. Please try again.");
  return { ok: true, data: { id: data.id, correct: data.correct ?? null, total: data.total ?? 0, submittedAt: text(data.submitted_at) } };
}

export async function saveMyMockReview(attemptId: string, raw: unknown): Promise<ServiceResult<null>> {
  const me = await student();
  if (!me) return fail("unauthorized", "Only a student can review their practice.");
  if (!isUuid(attemptId)) return fail("not_found", "That attempt isn't available.");
  const review = cleanMockReview(raw);
  if (!review) return fail("validation_error", "That self-review couldn't be saved.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("practice_attempts").update({ self_review: review }).eq("id", attemptId).eq("student_id", me.id).eq("mode", "mock").select("id");
  if (error) return mapDbError(error, "We couldn't save your self-review. Please try again.");
  if (!data || data.length === 0) return fail("not_found", "That attempt isn't available.");
  return { ok: true, data: null };
}

// The latest mock run, rebuilt into questions + answers for the review screen.
export async function getMyLatestMock(slug: string): Promise<ServiceResult<MockAttemptRecord | null>> {
  const me = await student();
  if (!me) return fail("unauthorized", "Only a student has mock runs.");
  if (!isSlug(slug)) return fail("not_found", NO_BANK);
  const supabase = await createClient();
  const { data, error } = await supabase.from("practice_attempts").select("id, answers, self_review, submitted_at").eq("student_id", me.id).eq("bank_slug", slug).eq("mode", "mock").order("submitted_at", { ascending: false }).limit(1).maybeSingle();
  if (error) return mapDbError(error, "We couldn't load your last attempt. Please try again.");
  if (!data) return { ok: true, data: null };
  const { data: items } = await supabase.from("practice_items").select("id, key, prompt, guidance").eq("bank_slug", slug).limit(500);
  const byId = new Map(((items ?? []) as Row[]).map((r) => [r.id as string, r]));
  const questions: GuidedPracticeItem[] = [];
  const answers: Record<string, string> = {};
  ((Array.isArray(data.answers) ? data.answers : []) as Row[]).forEach((a, i) => {
    const item = typeof a.itemId === "string" ? byId.get(a.itemId) : undefined;
    const id = item ? (item.key as string) : `own-${i + 1}`;
    const guidance = item ? toGuidance(item.guidance) : null;
    questions.push({ id, prompt: item ? text(item.prompt) : text(a.prompt), ...(guidance ? { guidance } : {}) });
    answers[id] = text(a.response);
  });
  const selfReview = cleanMockReview(data.self_review) ?? {};
  return { ok: true, data: { id: data.id, completedAt: text(data.submitted_at), questions, answers, selfReview } };
}

// ---- Mentor: a mentee's practice --------------------------------------------------------

export async function getMenteePractice(studentId: string): Promise<ServiceResult<{ answers: MenteePracticeAnswer[]; attempts: MenteePracticeAttempt[] }>> {
  const check = await getMyMentee(studentId); // "not found" unless in this mentor's batches
  if (!check.ok) return check as ServiceResult<never>;
  const supabase = await createClient();
  const [answers, attempts] = await Promise.all([
    supabase
      .from("practice_answers")
      .select("answer_text, selected_option_id, done, updated_at, item:practice_items(prompt, options, bank:practice_banks(title))")
      .eq("student_id", studentId)
      .order("updated_at", { ascending: false })
      .limit(15),
    supabase.from("practice_attempts").select("id, mode, correct, total, submitted_at, bank:practice_banks(title)").eq("student_id", studentId).order("submitted_at", { ascending: false }).limit(10),
  ]);
  const failed = answers.error ?? attempts.error;
  if (failed) return mapDbError(failed, "We couldn't load this student's practice. Please try again.");
  const one = (v: unknown) => (Array.isArray(v) ? v[0] : v) as Row | undefined;
  return {
    ok: true,
    data: {
      answers: ((answers.data ?? []) as Row[]).flatMap((r) => {
        const item = one(r.item);
        if (!item) return [];
        const option = toOptions(item.options)?.find((o) => o.id === r.selected_option_id);
        const answer = text(r.answer_text) || (option ? `Chose: ${option.label}` : "");
        if (!answer) return [];
        return [{ bankTitle: text(one(item.bank)?.title), prompt: text(item.prompt), answer, done: r.done === true, updatedAt: text(r.updated_at) }];
      }),
      attempts: ((attempts.data ?? []) as Row[]).map((r) => ({ id: r.id as string, bankTitle: text(one(r.bank)?.title), mode: r.mode === "mock" ? "mock" : "test", correct: typeof r.correct === "number" ? r.correct : null, total: Number(r.total) || 0, submittedAt: text(r.submitted_at) })),
    },
  };
}

// ---- Super Admin: editing banks ----------------------------------------------------------

export async function listBanksAdmin(): Promise<ServiceResult<AdminBankSummary[]>> {
  if (!(await superAdmin())) return fail("unauthorized", "Only a super admin can edit practice banks.");
  const supabase = await createClient();
  const [banks, items] = await Promise.all([
    supabase.from("practice_banks").select("slug, title, item_kind").order("title"),
    supabase.from("practice_items").select("bank_slug, active").limit(10000),
  ]);
  const failed = banks.error ?? items.error;
  if (failed) return mapDbError(failed, "We couldn't load practice banks. Please try again.");
  const counts = new Map<string, { active: number; inactive: number }>();
  for (const r of (items.data ?? []) as Row[]) {
    const c = counts.get(r.bank_slug as string) ?? { active: 0, inactive: 0 };
    if (r.active) c.active += 1;
    else c.inactive += 1;
    counts.set(r.bank_slug as string, c);
  }
  return {
    ok: true,
    data: ((banks.data ?? []) as Row[]).map((b) => ({ slug: b.slug as string, title: text(b.title), kind: b.item_kind === "mcq" ? "mcq" : "response", ...(counts.get(b.slug as string) ?? { active: 0, inactive: 0 }) })),
  };
}

export function toAdminItem(r: Row): AdminPracticeItem {
  return {
    id: r.id as string,
    key: text(r.key),
    position: Number(r.position) || 0,
    prompt: text(r.prompt),
    options: toOptions(r.options),
    correctOptionId: typeof r.correct_option_id === "string" ? r.correct_option_id : null,
    guidance: toGuidance(r.guidance),
    active: r.active === true,
  };
}

export async function getBankAdmin(slug: string): Promise<ServiceResult<{ bank: AdminBankSummary; items: AdminPracticeItem[] }>> {
  if (!(await superAdmin())) return fail("unauthorized", "Only a super admin can edit practice banks.");
  if (!isSlug(slug)) return fail("not_found", NO_BANK);
  const supabase = await createClient();
  const [bank, items] = await Promise.all([
    supabase.from("practice_banks").select("slug, title, item_kind").eq("slug", slug).maybeSingle(),
    supabase.from("practice_items").select(ITEM_COLS).eq("bank_slug", slug).order("position").limit(500),
  ]);
  const failed = bank.error ?? items.error;
  if (failed) return mapDbError(failed, "We couldn't load this bank. Please try again.");
  if (!bank.data) return fail("not_found", NO_BANK);
  const list = ((items.data ?? []) as Row[]).map(toAdminItem);
  return {
    ok: true,
    data: {
      bank: { slug, title: text(bank.data.title), kind: bank.data.item_kind === "mcq" ? "mcq" : "response", active: list.filter((i) => i.active).length, inactive: list.filter((i) => !i.active).length },
      items: list,
    },
  };
}

type ItemResult<T> = ServiceResult<T> & { fieldErrors?: ItemFieldErrors };

async function bankKind(slug: string): Promise<PracticeItemKind | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("practice_banks").select("item_kind").eq("slug", slug).maybeSingle();
  return data ? (data.item_kind === "mcq" ? "mcq" : "response") : null;
}

export async function createItem(slug: string, input: Partial<Record<keyof PracticeItemInput, unknown>>): Promise<ItemResult<{ id: string }>> {
  const me = await superAdmin();
  if (!me) return fail("unauthorized", "Only a super admin can edit practice banks.");
  if (!isSlug(slug)) return fail("not_found", NO_BANK);
  const kind = await bankKind(slug);
  if (!kind) return fail("not_found", NO_BANK);
  const key = `${slug}-${randomBytes(4).toString("hex")}`;
  const parsed = validateItemInput(kind, input, key);
  if (!parsed.ok) return { ...fail("validation_error", "Please fix the highlighted fields."), fieldErrors: parsed.errors };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("practice_items")
    .insert({ bank_slug: slug, key, prompt: parsed.value.prompt, options: parsed.value.options, correct_option_id: parsed.value.correctOptionId, guidance: parsed.value.guidance, created_by: me.id, updated_by: me.id })
    .select("id")
    .single();
  if (error) return mapDbError(error, "We couldn't add that question. Please try again.");
  return { ok: true, data: { id: data.id } };
}

export async function updateItem(id: string, input: Partial<Record<keyof PracticeItemInput, unknown>>): Promise<ItemResult<null>> {
  const me = await superAdmin();
  if (!me) return fail("unauthorized", "Only a super admin can edit practice banks.");
  if (!isUuid(id)) return fail("not_found", "That question isn't available.");
  const supabase = await createClient();
  const { data: row, error: readError } = await supabase.from("practice_items").select("bank_slug, key").eq("id", id).maybeSingle();
  if (readError) return mapDbError(readError);
  if (!row) return fail("not_found", "That question isn't available.");
  const kind = await bankKind(row.bank_slug);
  if (!kind) return fail("not_found", NO_BANK);
  const parsed = validateItemInput(kind, input, row.key);
  if (!parsed.ok) return { ...fail("validation_error", "Please fix the highlighted fields."), fieldErrors: parsed.errors };
  const { error } = await supabase
    .from("practice_items")
    .update({ prompt: parsed.value.prompt, options: parsed.value.options, correct_option_id: parsed.value.correctOptionId, guidance: parsed.value.guidance, updated_by: me.id })
    .eq("id", id);
  if (error) return mapDbError(error, "We couldn't save that question. Please try again.");
  return { ok: true, data: null };
}

export async function setItemActive(id: string, active: boolean): Promise<ServiceResult<null>> {
  const me = await superAdmin();
  if (!me) return fail("unauthorized", "Only a super admin can edit practice banks.");
  if (!isUuid(id)) return fail("not_found", "That question isn't available.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("practice_items").update({ active, updated_by: me.id }).eq("id", id).select("id");
  if (error) return mapDbError(error);
  if (!data || data.length === 0) return fail("not_found", "That question isn't available.");
  return { ok: true, data: null };
}

export async function moveItem(id: string, direction: "up" | "down"): Promise<ServiceResult<null>> {
  if (!(await superAdmin())) return fail("unauthorized", "Only a super admin can edit practice banks.");
  if (!isUuid(id)) return fail("not_found", "That question isn't available.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("practice_move_item", { p_item: id, p_direction: direction === "up" ? -1 : 1 });
  if (error) return mapDbError(error, "We couldn't reorder that question. Please try again.");
  return { ok: true, data: null };
}
