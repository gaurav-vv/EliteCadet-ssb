// Per-browser "recently viewed" trail for Day 2 resources — a small premium
// touch (redesign brief §19, Feature 2), not application state: it lives
// only in this browser's localStorage, is never read by the server, and
// never blocks navigation if it fails (private browsing, storage disabled,
// etc). Every access is wrapped in try/catch for exactly that reason.
import type { Day2TestCategory } from "@/types/day2-resources";

const STORAGE_KEY = "day2-recently-viewed";
const MAX_ENTRIES = 5;

export interface RecentlyViewedEntry {
  id: string;
  name: string;
  category: Day2TestCategory;
  url: string;
  viewedAt: number;
}

export function getRecentlyViewed(): RecentlyViewedEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// useSyncExternalStore plumbing (Day2RecentlyViewed) — this is what keeps a
// non-empty read from mismatching the server's necessarily-empty render:
// getServerSnapshot always returns the same empty array, and getSnapshot
// only returns a new reference when the underlying storage value actually
// changed, so React treats an unchanged read as "no update" rather than
// re-rendering every check.
const EMPTY_ENTRIES: RecentlyViewedEntry[] = [];
let cachedRaw: string | null | undefined;
let cachedEntries: RecentlyViewedEntry[] = EMPTY_ENTRIES;

export function getRecentlyViewedSnapshot(): RecentlyViewedEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) return cachedEntries;
    cachedRaw = raw;
    const parsed = raw ? JSON.parse(raw) : [];
    cachedEntries = Array.isArray(parsed) ? parsed : EMPTY_ENTRIES;
    return cachedEntries;
  } catch {
    return EMPTY_ENTRIES;
  }
}

export function getRecentlyViewedServerSnapshot(): RecentlyViewedEntry[] {
  return EMPTY_ENTRIES;
}

export function subscribeToRecentlyViewed(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

export function recordRecentlyViewed(entry: Omit<RecentlyViewedEntry, "viewedAt">): void {
  try {
    const existing = getRecentlyViewed().filter((e) => e.id !== entry.id);
    const next = [{ ...entry, viewedAt: Date.now() }, ...existing].slice(0, MAX_ENTRIES);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable — recently-viewed is a convenience, never load-bearing.
  }
}
