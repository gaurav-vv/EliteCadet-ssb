// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const insert = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: () => ({ insert }) }) }));

import { submitDemoRequest } from "@/lib/server/demo-requests/service";

const valid = { fullName: "Asha Rao", email: "asha@example.com", interest: "mentor" };

beforeEach(() => insert.mockReset());

describe("submitDemoRequest", () => {
  it("never touches the database when validation fails", async () => {
    const result = await submitDemoRequest({ ...valid, email: "nope" });
    expect(result).toMatchObject({ ok: false, error: { code: "validation_error" }, fieldErrors: { email: expect.any(String) } });
    expect(insert).not.toHaveBeenCalled();
  });

  it("inserts the cleaned row (insert only — nothing is read back)", async () => {
    insert.mockResolvedValue({ error: null });
    expect(await submitDemoRequest(valid)).toEqual({ ok: true, data: null });
    expect(insert).toHaveBeenCalledWith({ full_name: "Asha Rao", email: "asha@example.com", phone: null, organisation: null, interest: "mentor", message: null });
  });

  it("explains a missing table without leaking the database error", async () => {
    insert.mockResolvedValue({ error: { code: "PGRST205", message: "Could not find the table 'public.demo_requests'" } });
    const result = await submitDemoRequest(valid);
    expect(result.error?.code).toBe("not_set_up");
    expect(result.error?.message).not.toMatch(/demo_requests|PGRST/);
  });

  it("maps any other failure to a plain retry message", async () => {
    insert.mockResolvedValue({ error: { code: "42501", message: "permission denied" } });
    expect((await submitDemoRequest(valid)).error).toEqual({ code: "server_error", message: "We couldn't send your request. Please try again." });
  });
});
