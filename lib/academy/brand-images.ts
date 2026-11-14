import { existsSync } from "node:fs";
import path from "node:path";

// Images the academy supplies itself. Drop a file into /public/academy using
// one of the base names below (.jpg, .jpeg, .png or .webp) and it appears —
// no code change. With no file, the components show a plain text card.
const EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;

export type BrandImageKey = "sidebar-card" | "hero-banner";

// In production /public is fixed at deploy time, so the lookup (up to four
// filesystem checks, run on every workspace page) is done once per key.
// In development it is not memoised, so a dropped-in file still appears
// without a restart.
const resolved = new Map<BrandImageKey, string | null>();

function lookup(key: BrandImageKey): string | null {
  for (const ext of EXTENSIONS) {
    const file = `${key}.${ext}`;
    if (existsSync(path.join(process.cwd(), "public", "academy", file))) return `/academy/${file}`;
  }
  return null;
}

// Server-only (reads the filesystem): call from Server Components.
export function getBrandImage(key: BrandImageKey): string | null {
  if (process.env.NODE_ENV !== "production") return lookup(key);
  if (!resolved.has(key)) resolved.set(key, lookup(key));
  return resolved.get(key) ?? null;
}
