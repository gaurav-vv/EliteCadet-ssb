// Per-browser only, like the PIQ form itself (piq-storage.ts): answers to the
// questions built from a student's own PIQ. Bank questions are saved to the
// account instead (practice_answers, 0014).

import type { AnswerPatch, SavedPracticeAnswer } from "@/types/practice";

const KEY = "ssb-piq-answers";

export function readPiqAnswers(): Record<string, SavedPracticeAnswer> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, SavedPracticeAnswer>) : {};
  } catch {
    return {};
  }
}

export function savePiqAnswer(id: string, patch: AnswerPatch): { ok: boolean; error?: { message: string } } {
  const all = readPiqAnswers();
  const prev = all[id] ?? { text: "", optionId: null, selfReview: [], done: false, updatedAt: "" };
  all[id] = { ...prev, ...patch, optionId: patch.optionId ?? prev.optionId, updatedAt: new Date().toISOString() };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(all));
    return { ok: true };
  } catch {
    return { ok: false, error: { message: "This browser isn't saving data. Your answer is still on screen for this visit." } };
  }
}
