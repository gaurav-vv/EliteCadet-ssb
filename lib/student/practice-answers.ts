// Per-browser only, same rationale/pattern as ssb-journey-progress.ts: keeps
// what a student typed in a free-text practice bank so moving between
// questions or reloading never loses it (AGENTS.md §11 "never lose input").
// Real, account-scoped answers replace this once a practice backend exists.

const ANSWERS_KEY = "ssb-practice-answers";

export interface SavedAnswer {
  text: string;
  /** Self-review checklist items the student ticked for this answer. */
  selfReview: string[];
  updatedAt: string;
}

type AnswerMap = Record<string, SavedAnswer>;

function answerKey(dayId: string, moduleId: string, itemId: string): string {
  return `${dayId}:${moduleId}:${itemId}`;
}

function readAll(): AnswerMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(ANSWERS_KEY);
    return raw ? (JSON.parse(raw) as AnswerMap) : {};
  } catch {
    return {};
  }
}

function writeAll(map: AnswerMap): void {
  try {
    window.localStorage.setItem(ANSWERS_KEY, JSON.stringify(map));
  } catch {
    // Private browsing / blocked storage — the text stays in the textarea
    // for this visit, it just won't survive a reload.
  }
}

export function readAnswer(dayId: string, moduleId: string, itemId: string): SavedAnswer | null {
  return readAll()[answerKey(dayId, moduleId, itemId)] ?? null;
}

function update(dayId: string, moduleId: string, itemId: string, patch: Partial<SavedAnswer>): SavedAnswer {
  const map = readAll();
  const key = answerKey(dayId, moduleId, itemId);
  const existing: SavedAnswer | undefined = map[key];
  const next: SavedAnswer = {
    text: existing?.text ?? "",
    selfReview: existing?.selfReview ?? [],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  writeAll({ ...map, [key]: next });
  return next;
}

export function saveAnswerText(dayId: string, moduleId: string, itemId: string, text: string): SavedAnswer {
  return update(dayId, moduleId, itemId, { text });
}

export function saveSelfReview(dayId: string, moduleId: string, itemId: string, selfReview: string[]): SavedAnswer {
  return update(dayId, moduleId, itemId, { selfReview });
}
