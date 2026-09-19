// Per-browser only until real accounts exist (T013/T014 deferred — status.md,
// 2026-09-18). Real, account-scoped completion state replaces this later.
export const READ_RESOURCES_KEY = "ssb-resources-read";

export function readCompletedSlugs(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(READ_RESOURCES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function setResourceRead(slug: string, read: boolean): string[] {
  const current = readCompletedSlugs();
  const next = read ? Array.from(new Set([...current, slug])) : current.filter((s) => s !== slug);
  try {
    window.localStorage.setItem(READ_RESOURCES_KEY, JSON.stringify(next));
  } catch {
    // Private browsing / blocked storage — the toggle still works for this
    // render, it just won't persist across a refresh.
  }
  return next;
}
