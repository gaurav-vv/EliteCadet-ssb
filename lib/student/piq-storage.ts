// Per-browser only, same pattern as profile-storage.ts, until a practice
// backend exists (specs.md §6.4b).
import { normalisePiq, type PiqInput } from "@/lib/practice/piq-questions";

export const PIQ_KEY = "ssb-interview-piq";

export function readPiq(): PiqInput | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PIQ_KEY);
    return raw ? normalisePiq(JSON.parse(raw) as PiqInput) : null;
  } catch {
    return null;
  }
}

export function writePiq(piq: PiqInput): PiqInput {
  const clean = normalisePiq(piq);
  try {
    window.localStorage.setItem(PIQ_KEY, JSON.stringify(clean));
  } catch {
    // Private browsing / blocked storage — questions still show for this
    // visit, the PIQ just won't survive a reload.
  }
  return clean;
}
