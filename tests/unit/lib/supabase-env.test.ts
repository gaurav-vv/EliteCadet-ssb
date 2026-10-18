// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { publicSupabaseEnv } from "@/lib/supabase/env";

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
