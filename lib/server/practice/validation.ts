// Pure practice rules (tests/unit/lib/practice-validation.test.ts). No I/O.

import { istDayKey } from "@/lib/server/sessions/validation";
import type { AnswerPatch, AttemptAnswer, PracticeItemInput, PracticeItemKind } from "@/types/practice";

export const MAX_ANSWER = 5000;
export const MAX_REVIEW_ITEMS = 20;
export const MAX_ATTEMPT_ANSWERS = 200;

export const isSlug = (v: unknown): v is string => typeof v === "string" && /^[a-z0-9-]{2,40}$/.test(v);
export const isKey = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(v);
export const isClientKey = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9_.-]{8,80}$/.test(v);

const strings = (v: unknown, max: number, each = 200): string[] | null =>
  Array.isArray(v) && v.length <= max && v.every((x) => typeof x === "string" && x.length <= each) ? (v as string[]) : null;

// Only the fields that were sent, each checked; anything malformed rejects the patch.
export function cleanAnswerPatch(raw: unknown): { ok: true; value: AnswerPatch } | { ok: false; message: string } {
  if (typeof raw !== "object" || raw === null) return { ok: false, message: "Nothing to save." };
  const r = raw as Record<string, unknown>;
  const out: AnswerPatch = {};
  if ("text" in r) {
    if (typeof r.text !== "string" || r.text.length > MAX_ANSWER) return { ok: false, message: `Answers can be up to ${MAX_ANSWER} characters.` };
    out.text = r.text;
  }
  if ("optionId" in r) {
    if (r.optionId !== null && !isKey(r.optionId)) return { ok: false, message: "Choose one of the options." };
    out.optionId = r.optionId as string | null;
  }
  if ("selfReview" in r) {
    const list = strings(r.selfReview, MAX_REVIEW_ITEMS);
    if (!list) return { ok: false, message: "That self-review couldn't be saved." };
    out.selfReview = list;
  }
  if ("done" in r) {
    if (typeof r.done !== "boolean") return { ok: false, message: "That couldn't be saved." };
    out.done = r.done;
  }
  if (Object.keys(out).length === 0) return { ok: false, message: "Nothing to save." };
  return { ok: true, value: out };
}

export function cleanAttemptAnswers(raw: unknown, allowCustom: boolean): AttemptAnswer[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_ATTEMPT_ANSWERS) return null;
  const out: AttemptAnswer[] = [];
  for (const a of raw) {
    if (typeof a !== "object" || a === null) return null;
    const r = a as Record<string, unknown>;
    const response = r.response === undefined ? undefined : typeof r.response === "string" && r.response.length <= MAX_ANSWER ? r.response : null;
    const optionId = r.optionId === undefined ? undefined : isKey(r.optionId) ? r.optionId : null;
    if (response === null || optionId === null) return null;
    if (r.key !== undefined) {
      if (!isKey(r.key)) return null;
      out.push({ key: r.key, response, optionId });
    } else {
      const prompt = typeof r.prompt === "string" ? r.prompt.trim() : "";
      if (!allowCustom || prompt.length === 0 || prompt.length > 500) return null;
      out.push({ prompt, response });
    }
  }
  return out;
}

export function cleanMockReview(raw: unknown): Record<string, string[]> | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const entries = Object.entries(raw as Record<string, unknown>);
  if (entries.length > MAX_ATTEMPT_ANSWERS) return null;
  const out: Record<string, string[]> = {};
  for (const [k, v] of entries) {
    const list = strings(v, MAX_REVIEW_ITEMS);
    if (!list || k.length > 120) return null;
    out[k] = list;
  }
  return out;
}

// Consecutive IST days with practice, ending today (or yesterday, so a
// streak isn't "broken" before today's practice has happened).
export function streakDays(activityIsoTimes: string[], nowIso: string): number {
  const days = new Set(activityIsoTimes.map(istDayKey));
  const step = (key: string) => {
    const d = new Date(`${key}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  };
  let cursor = istDayKey(nowIso);
  if (!days.has(cursor)) cursor = step(cursor);
  let n = 0;
  while (days.has(cursor)) {
    n += 1;
    cursor = step(cursor);
  }
  return n;
}

export type ItemFieldErrors = Partial<Record<keyof PracticeItemInput, string>>;

export interface CleanItem {
  prompt: string;
  options: { id: string; label: string }[] | null;
  correctOptionId: string | null;
  guidance: { assesses: string; tips: string[] } | null;
}

const lines = (v: unknown) =>
  String(v ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

// Super Admin item form → a row the 0014 trigger accepts. Option ids are
// stable per item (`<itemKey>-a`…), so editing labels keeps old answers valid.
export function validateItemInput(kind: PracticeItemKind, raw: Partial<Record<keyof PracticeItemInput, unknown>>, itemKey: string): { ok: true; value: CleanItem } | { ok: false; errors: ItemFieldErrors } {
  const errors: ItemFieldErrors = {};
  const prompt = String(raw.prompt ?? "").trim();
  if (prompt.length < 1) errors.prompt = "Enter the question or prompt.";
  else if (prompt.length > 2000) errors.prompt = "Keep it under 2000 characters.";

  let options: CleanItem["options"] = null;
  let correctOptionId: string | null = null;
  let guidance: CleanItem["guidance"] = null;

  if (kind === "mcq") {
    const labels = lines(raw.options);
    if (labels.length < 2 || labels.length > 6) errors.options = "Give 2 to 6 options, one per line.";
    else if (labels.some((l) => l.length > 300)) errors.options = "Keep each option under 300 characters.";
    const n = Number(raw.correct);
    if (!Number.isInteger(n) || n < 1 || n > labels.length) errors.correct = "Enter the number of the correct option.";
    if (!errors.options && !errors.correct) {
      const letters = "abcdef";
      options = labels.map((label, i) => ({ id: `${itemKey}-${letters[i]}`, label }));
      correctOptionId = options[n - 1].id;
    }
  } else {
    const assesses = String(raw.assesses ?? "").trim();
    const tips = lines(raw.tips);
    if (assesses || tips.length > 0) {
      if (!assesses) errors.assesses = "Say what this question checks, or clear the tips.";
      else if (assesses.length > 300) errors.assesses = "Keep it under 300 characters.";
      if (tips.length > 8 || tips.some((t) => t.length > 300)) errors.tips = "Up to 8 tips, each under 300 characters.";
      if (!errors.assesses && !errors.tips) guidance = { assesses, tips };
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { prompt, options, correctOptionId, guidance } };
}
