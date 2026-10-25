import { readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Supabase records a migration by the number before the first "_". Two files
// with the same number (0022_live_meetings + 0022_fix_sessions_…) make
// `supabase start` / `db push` fail with a duplicate-key error on a fresh
// machine, and a gap means a teammate can't tell what is missing.
const dir = path.join(process.cwd(), "supabase", "migrations");
const files = readdirSync(dir)
  .filter((name) => name.endsWith(".sql"))
  .sort();

describe("supabase/migrations", () => {
  it("names every file NNNN_description.sql", () => {
    for (const name of files) expect(name).toMatch(/^\d{4}_[a-z0-9_]+\.sql$/);
  });

  it("uses each version number once", () => {
    const versions = files.map((name) => name.slice(0, 4));
    const duplicates = versions.filter((v, i) => versions.indexOf(v) !== i);
    expect(duplicates).toEqual([]);
  });

  it("has no gaps, starting at 0001", () => {
    const versions = files.map((name) => Number(name.slice(0, 4)));
    expect(versions).toEqual(versions.map((_, i) => i + 1));
  });
});

describe("supabase/catchup", () => {
  it("has one generated catch-up file that ends at the newest migration", () => {
    const catchups = readdirSync(path.join(process.cwd(), "supabase", "catchup")).filter((n) => /^production_catchup_.*\.sql$/.test(n));
    const newest = files[files.length - 1].slice(0, 4);
    expect(catchups).toEqual([`production_catchup_0005_${newest}.sql`]);
  });
});
