// @vitest-environment node
// app/dev-preview/[role]: dev-only, opt-in, and never a way around the real
// role checks. Supabase clients are faked; env is set per test.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { GET } from "@/app/dev-preview/[role]/route";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const SERVICE_KEY = "service-role-secret-value";
const PASSWORD = "a-long-random-dev-password";

function call(role: string) {
  return GET(new Request(`http://localhost:3000/dev-preview/${role}`), { params: Promise.resolve({ role }) });
}

function fakeClients(profileRole: string | null = "student") {
  const createUser = vi.fn().mockResolvedValue({ error: null });
  vi.mocked(createSupabaseClient).mockReturnValue({ auth: { admin: { createUser } } } as unknown as ReturnType<typeof createSupabaseClient>);
  const signOut = vi.fn().mockResolvedValue({ error: null });
  const maybeSingle = vi.fn().mockResolvedValue({ data: profileRole ? { role: profileRole, status: "active", academy: null } : null, error: null });
  vi.mocked(createServerClient).mockResolvedValue({
    auth: { signInWithPassword: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } }, error: null }), signOut },
    from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) })) })),
  } as unknown as Awaited<ReturnType<typeof createServerClient>>);
  return { createUser, signOut };
}

beforeEach(() => {
  vi.mocked(createSupabaseClient).mockReset();
  vi.mocked(createServerClient).mockReset();
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
  vi.stubEnv("DEV_PREVIEW_ENABLED", "true");
  vi.stubEnv("DEV_PREVIEW_PASSWORD", PASSWORD);
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", SERVICE_KEY);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("/dev-preview/[role]", () => {
  it("does not exist in production, whatever the opt-in flag says", async () => {
    vi.stubEnv("NODE_ENV", "production");
    fakeClients();
    expect((await call("student")).status).toBe(404);
    expect(createSupabaseClient).not.toHaveBeenCalled();
  });

  it("is off unless DEV_PREVIEW_ENABLED=true", async () => {
    vi.stubEnv("DEV_PREVIEW_ENABLED", "");
    expect((await call("student")).status).toBe(404);
  });

  it.each(["janitor", "__proto__", "constructor"])("rejects an unknown role %s", async (role) => {
    expect((await call(role)).status).toBe(404);
  });

  it("explains a missing service-role key with a 503 — no crash, no anon-key fallback, no secret in the body", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const res = await call("student");
    const body = await res.text();
    expect(res.status).toBe(503);
    expect(body).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(body).not.toContain("anon-key");
    expect(createSupabaseClient).not.toHaveBeenCalled();
  });

  it("refuses to run with no (or a short) preview password", async () => {
    vi.stubEnv("DEV_PREVIEW_PASSWORD", "pw-xyz");
    const res = await call("student");
    const body = await res.text();
    expect(res.status).toBe(503);
    expect(body).toContain("DEV_PREVIEW_PASSWORD");
    expect(body).not.toContain("pw-xyz");
  });

  it("signs in as the role's preview account and opens its dashboard", async () => {
    const { createUser } = fakeClients("mentor");
    const res = await call("mentor");
    expect(res.headers.get("location")).toBe("http://localhost:3000/mentor");
    expect(createUser).toHaveBeenCalledWith(expect.objectContaining({ email: "preview.mentor@ssbacademy.dev", password: PASSWORD, app_metadata: { role: "mentor" } }));
    expect(vi.mocked(createSupabaseClient).mock.calls[0][1]).toBe(SERVICE_KEY);
  });

  it("signs back out and explains a preview account whose real role differs (never /forbidden, never a role grant)", async () => {
    const { signOut } = fakeClients("student");
    const res = await call("super_admin");
    expect(res.status).toBe(409);
    expect(signOut).toHaveBeenCalled();
    expect(await res.text()).not.toContain(SERVICE_KEY);
  });
});
