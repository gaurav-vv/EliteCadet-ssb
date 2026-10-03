import { existsSync } from "node:fs";
import path from "node:path";

// Images the academy supplies itself. Drop a file into /public/academy using
// one of the base names below (.jpg, .jpeg, .png or .webp) and it appears —
// no code change. With no file, the components show a plain text card.
const EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;

export type BrandImageKey = "sidebar-card" | "hero-banner";

// Server-only (reads the filesystem): call from Server Components.
export function getBrandImage(key: BrandImageKey): string | null {
  for (const ext of EXTENSIONS) {
    const file = `${key}.${ext}`;
    if (existsSync(path.join(process.cwd(), "public", "academy", file))) return `/academy/${file}`;
  }
  return null;
}
