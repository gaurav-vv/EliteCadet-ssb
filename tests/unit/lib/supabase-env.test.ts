// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { localMailboxUrl, publicSupabaseEnv } from "@/lib/supabase/env";

afterEach(() => vi.unstubAllEnvs());

describe("publicSupabaseEnv", () => {
  it("names every missing variable instead of supabase-js's bare error, without leaking values", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    expect(() => publicSupabaseEnv()).toThrow(/missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  });

  it("returns the configured values", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    expect(publicSupabaseEnv()).toEqual({ url: "https://example.supabase.co", anonKey: "anon-key" });
  });
});

describe("localMailboxUrl", () => {
  it("points at Mailpit only for a local Supabase stack", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    expect(localMailboxUrl()).toBe("http://127.0.0.1:54324");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
    expect(localMailboxUrl()).toBe("http://localhost:54324");
  });

  it("is null for a hosted project, or no/invalid URL — never claims capture there", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abcd.supabase.co");
    expect(localMailboxUrl()).toBeNull();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect(localMailboxUrl()).toBeNull();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "not a url");
    expect(localMailboxUrl()).toBeNull();
  });
});
