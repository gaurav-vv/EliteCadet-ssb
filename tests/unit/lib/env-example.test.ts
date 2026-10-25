import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const text = readFileSync(path.join(process.cwd(), ".env.example"), "utf8");
const assignments = text
  .split(/\r?\n/)
  .map((line) => line.match(/^([A-Z0-9_]+)=(.*)$/))
  .filter((m): m is RegExpMatchArray => m !== null)
  .map((m) => ({ name: m[1], value: m[2].trim() }));

describe(".env.example", () => {
  it("lists every variable the app reads", () => {
    const names = assignments.map((a) => a.name);
    for (const name of [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "LIVEKIT_URL",
      "LIVEKIT_API_KEY",
      "LIVEKIT_API_SECRET",
    ]) {
      expect(names).toContain(name);
    }
  });

  it("holds placeholders only — no real keys or JWTs", () => {
    for (const { name, value } of assignments) {
      expect(value, name).not.toMatch(/eyJ[\w-]{10,}\./);
      expect(value, name).not.toMatch(/^sb_(publishable|secret)_/);
      if (/KEY|SECRET|PASSWORD/.test(name)) expect(value, name).toBe("");
    }
  });

  it("never exposes a server-side secret through a NEXT_PUBLIC_ variable", () => {
    for (const { name } of assignments) {
      if (name.startsWith("NEXT_PUBLIC_")) expect(name).not.toMatch(/SERVICE_ROLE|SECRET|LIVEKIT|PASSWORD/);
    }
  });

  it("does not point the shared example at a hosted project", () => {
    for (const { value } of assignments) expect(value).not.toMatch(/\.supabase\.co/);
  });
});
