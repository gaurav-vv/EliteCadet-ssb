// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn(() => ({})) }));

import { createClient } from "@supabase/supabase-js";
import { AdminClientConfigError, createAdminClient, missingAdminConfig } from "@/lib/supabase/admin";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.mocked(createClient).mockClear();
});

describe("createAdminClient", () => {
  it("throws a named, actionable error when the service-role key is missing — never falls back to the anon key", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect(missingAdminConfig()).toEqual(["SUPABASE_SERVICE_ROLE_KEY"]);
    expect(() => createAdminClient()).toThrow(AdminClientConfigError);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("builds a non-persisting service-role client when configured", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");
    createAdminClient();
    expect(createClient).toHaveBeenCalledWith("https://example.supabase.co", "service-key", { auth: { autoRefreshToken: false, persistSession: false } });
  });
});
