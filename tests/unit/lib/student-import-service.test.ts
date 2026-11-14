// @vitest-environment node
// Bulk student import, server side, with a mocked actor and repository. What matters here: only an
// academy admin can use it, the academy always comes from the session (never from a row), every row is
// validated again, a retry never creates anyone twice, and a partial failure is reported as one.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth/guard", () => ({ getActor: vi.fn() }));
vi.mock("@/lib/server/academy-people/repository", () => ({
  findAccountByEmail: vi.fn(),
  findMemberEmails: vi.fn(),
  addExistingStudent: vi.fn(),
  inviteByEmail: vi.fn(),
}));

import { getActor } from "@/lib/server/auth/guard";
import * as repo from "@/lib/server/academy-people/repository";
import { importStudentChunk, previewStudentImport } from "@/lib/server/academy-people/student-import-service";
import { IMPORT_CHUNK_SIZE, IMPORT_PREVIEW_CHUNK_SIZE } from "@/lib/server/academy-people/student-import";

const AC = "11111111-1111-4111-8111-111111111111";
const OTHER_AC = "99999999-9999-4999-8999-999999999999";
const ME = "22222222-2222-4222-8222-222222222222";
const ID = "33333333-3333-4333-8333-333333333333";
const ORIGIN = "http://app.test";

const actor = (role: "academy_admin" | "mentor" | "student" | "super_admin", academyId: string | null = AC) => ({ id: ME, email: null, profile: { id: ME, role, fullName: "Me", academyId, status: "active" as const } });
const row = (n: number, email: string, fullName = "Asha Rao") => ({ row: n, email, fullName });

// An existing account without an academy joins; an unknown email is invited.
function accounts(opts: { existing?: string[]; blockedOther?: string[]; nonStudent?: string[] } = {}) {
  vi.mocked(repo.addExistingStudent).mockImplementation(async (email: string) => {
    if (opts.blockedOther?.includes(email)) return { data: null, error: { code: "23505" } };
    if (opts.nonStudent?.includes(email)) return { data: null, error: { code: "23514" } };
    if (opts.existing?.includes(email)) return { data: { id: ID, fullName: "Existing Person" }, error: null };
    return { data: null, error: { code: "P0002" } };
  });
  vi.mocked(repo.inviteByEmail).mockResolvedValue({ data: { id: ID }, error: null });
}

beforeEach(() => {
  vi.mocked(getActor).mockReset();
  for (const fn of Object.values(repo)) (fn as ReturnType<typeof vi.fn>).mockReset();
  vi.mocked(getActor).mockResolvedValue(actor("academy_admin"));
  vi.mocked(repo.findMemberEmails).mockResolvedValue({ data: new Set(), error: null });
});

describe("who may import", () => {
  it.each([
    ["a mentor", actor("mentor")],
    ["a student", actor("student")],
    ["a super admin (no academy of their own)", actor("super_admin", null)],
    ["an academy admin without an academy", actor("academy_admin", null)],
    ["nobody signed in", null],
  ])("refuses %s, with no database access at all", async (_n, a) => {
    vi.mocked(getActor).mockResolvedValue(a);
    expect((await previewStudentImport([row(2, "a@x.co")])).error?.code).toBe("unauthorized");
    expect((await importStudentChunk([row(2, "a@x.co")], ORIGIN)).error?.code).toBe("unauthorized");
    for (const fn of Object.values(repo)) expect(fn).not.toHaveBeenCalled();
  });
});

describe("the request is untrusted input", () => {
  it.each([
    ["not an array", { row: 2 }],
    ["empty", []],
    ["a non-object row", ["a@x.co"]],
    ["a missing email", [{ row: 2, fullName: "Asha" }]],
    ["a non-string name", [{ row: 2, email: "a@x.co", fullName: 7 }]],
    ["a bad row number", [{ row: 0, email: "a@x.co", fullName: "Asha" }]],
    ["a fractional row number", [{ row: 2.5, email: "a@x.co", fullName: "Asha" }]],
    ["an absurdly long email", [{ row: 2, email: `${"a".repeat(400)}@x.co`, fullName: "Asha" }]],
  ])("rejects %s before touching the database", async (_n, input) => {
    expect((await importStudentChunk(input, ORIGIN)).error?.code).toBe("validation_error");
    expect((await previewStudentImport(input)).error?.code).toBe("validation_error");
    for (const fn of Object.values(repo)) expect(fn).not.toHaveBeenCalled();
  });

  it("limits how many rows one request may carry (no unbounded work)", async () => {
    const many = (n: number) => Array.from({ length: n }, (_, i) => row(i + 2, `s${i}@x.co`));
    expect((await importStudentChunk(many(IMPORT_CHUNK_SIZE + 1), ORIGIN)).error?.code).toBe("validation_error");
    expect((await previewStudentImport(many(IMPORT_PREVIEW_CHUNK_SIZE + 1))).error?.code).toBe("validation_error");
    accounts();
    expect((await importStudentChunk(many(IMPORT_CHUNK_SIZE), ORIGIN)).ok).toBe(true);
  });
});

describe("importStudentChunk: the academy and role are never taken from the file", () => {
  it("invites into the signed-in admin's academy, as a student, whatever the row says", async () => {
    accounts();
    const hostile = [{ row: 2, email: "new@x.co", fullName: "New Person", academyId: OTHER_AC, academy_id: OTHER_AC, role: "super_admin", app_metadata: { role: "super_admin" } }];
    const res = await importStudentChunk(hostile, ORIGIN);
    expect(res.data?.rows[0].result).toBe("invited");
    expect(repo.inviteByEmail).toHaveBeenCalledTimes(1);
    expect(repo.inviteByEmail).toHaveBeenCalledWith({ email: "new@x.co", fullName: "New Person", role: "student", academyId: AC, redirectTo: `${ORIGIN}/reset-password` });
    expect(repo.findMemberEmails).toHaveBeenCalledWith(AC, ["new@x.co"]);
  });
});

describe("importStudentChunk: creating students", () => {
  it("invites new people and joins existing accounts, with one result per row", async () => {
    accounts({ existing: ["old@x.co"] });
    const res = await importStudentChunk([row(2, "NEW@x.co", "  New   Person "), row(3, "old@x.co", "Old Person")], ORIGIN);
    expect(res.ok).toBe(true);
    expect(res.data?.stopped).toBeNull();
    expect(res.data?.rows.map((r) => [r.row, r.email, r.result])).toEqual([[2, "new@x.co", "invited"], [3, "old@x.co", "joined"]]);
    expect(repo.inviteByEmail).toHaveBeenCalledTimes(1);
    expect(vi.mocked(repo.inviteByEmail).mock.calls[0][0].fullName).toBe("New Person");
  });

  it("fails invalid rows with their reasons and sends nothing for them", async () => {
    accounts();
    const res = await importStudentChunk([row(2, "not-an-email"), row(3, "a@x.co", ""), row(4, "ok@x.co")], ORIGIN);
    expect(res.data?.rows.map((r) => r.result)).toEqual(["failed", "failed", "invited"]);
    expect(res.data?.rows[0].message).toMatch(/Invalid email/);
    expect(res.data?.rows[1].message).toMatch(/full_name/);
    expect(repo.inviteByEmail).toHaveBeenCalledTimes(1);
  });

  it("skips a repeated email inside the chunk", async () => {
    accounts();
    const res = await importStudentChunk([row(2, "a@x.co"), row(3, "A@X.co", "Again")], ORIGIN);
    expect(res.data?.rows.map((r) => r.result)).toEqual(["invited", "skipped"]);
    expect(repo.inviteByEmail).toHaveBeenCalledTimes(1);
  });
});

describe("importStudentChunk: retrying never creates anyone twice", () => {
  it("skips students who already belong to the academy (no second invite, no second account)", async () => {
    accounts();
    vi.mocked(repo.findMemberEmails).mockResolvedValue({ data: new Set(["a@x.co"]), error: null });
    const res = await importStudentChunk([row(2, "a@x.co"), row(3, "b@x.co")], ORIGIN);
    expect(res.data?.rows.map((r) => r.result)).toEqual(["skipped", "invited"]);
    expect(repo.addExistingStudent).toHaveBeenCalledTimes(1);
    expect(repo.addExistingStudent).toHaveBeenCalledWith("b@x.co");
  });

  it("a second run of the same chunk does nothing once the first has created them", async () => {
    accounts();
    const chunk = [row(2, "a@x.co"), row(3, "b@x.co")];
    expect((await importStudentChunk(chunk, ORIGIN)).data?.rows.map((r) => r.result)).toEqual(["invited", "invited"]);
    // The members lookup now sees both (as it would after the first run).
    vi.mocked(repo.findMemberEmails).mockResolvedValue({ data: new Set(["a@x.co", "b@x.co"]), error: null });
    expect((await importStudentChunk(chunk, ORIGIN)).data?.rows.map((r) => r.result)).toEqual(["skipped", "skipped"]);
    expect(repo.inviteByEmail).toHaveBeenCalledTimes(2); // not 4
  });

  it("creates nothing if it cannot tell who is already a member", async () => {
    accounts();
    vi.mocked(repo.findMemberEmails).mockResolvedValue({ data: null, error: { code: "XX000" } });
    const res = await importStudentChunk([row(2, "a@x.co")], ORIGIN);
    expect(res.ok).toBe(false);
    expect(repo.addExistingStudent).not.toHaveBeenCalled();
    expect(repo.inviteByEmail).not.toHaveBeenCalled();
  });
});

describe("importStudentChunk: partial failure is reported as such", () => {
  it("keeps going after one row fails and reports every row honestly", async () => {
    accounts();
    vi.mocked(repo.inviteByEmail).mockImplementation(async ({ email }) => (email === "bad@x.co" ? { data: null, error: { code: "email_address_invalid" } } : { data: { id: ID }, error: null }));
    const res = await importStudentChunk([row(2, "a@x.co"), row(3, "bad@x.co"), row(4, "c@x.co")], ORIGIN);
    expect(res.data?.rows.map((r) => r.result)).toEqual(["invited", "failed", "invited"]);
    expect(res.data?.rows[1].message).toMatch(/rejected this address/);
    expect(res.data?.stopped).toBeNull();
  });

  it("reports a database failure on one row without leaking internals", async () => {
    vi.mocked(repo.addExistingStudent).mockImplementation(async (email: string) => (email === "boom@x.co" ? { data: null, error: { code: "XX000", message: 'relation "secret_table" does not exist' } } : { data: null, error: { code: "P0002" } }));
    vi.mocked(repo.inviteByEmail).mockResolvedValue({ data: { id: ID }, error: null });
    const res = await importStudentChunk([row(2, "boom@x.co"), row(3, "fine@x.co")], ORIGIN);
    expect(res.data?.rows.map((r) => r.result)).toEqual(["failed", "invited"]);
    expect(JSON.stringify(res)).not.toMatch(/secret_table|relation/);
  });

  it("stops at the email rate limit and reports the rest as not processed", async () => {
    accounts();
    vi.mocked(repo.inviteByEmail).mockResolvedValueOnce({ data: { id: ID }, error: null }).mockResolvedValueOnce({ data: null, error: { code: "over_email_send_rate_limit" } });
    const res = await importStudentChunk([row(2, "a@x.co"), row(3, "b@x.co"), row(4, "c@x.co"), row(5, "d@x.co")], ORIGIN);
    expect(res.data?.stopped).toBe("email_limit");
    expect(res.data?.rows.map((r) => r.result)).toEqual(["invited", "failed", "not_processed", "not_processed"]);
    expect(repo.inviteByEmail).toHaveBeenCalledTimes(2); // never hammered
    expect(res.data?.rows[3].message).toMatch(/Upload the file again/);
  });

  it("stops when invitations are not set up on the server", async () => {
    accounts();
    vi.mocked(repo.inviteByEmail).mockResolvedValue({ data: null, error: { code: "admin_unavailable" } });
    const res = await importStudentChunk([row(2, "a@x.co"), row(3, "b@x.co")], ORIGIN);
    expect(res.data?.stopped).toBe("not_set_up");
    expect(res.data?.rows.map((r) => r.result)).toEqual(["failed", "not_processed"]);
  });
});

describe("importStudentChunk: other academies", () => {
  it("never takes another academy's student, nor a non-student account, and never invites them", async () => {
    accounts({ blockedOther: ["theirs@x.co"], nonStudent: ["staff@x.co"] });
    const res = await importStudentChunk([row(2, "theirs@x.co"), row(3, "staff@x.co")], ORIGIN);
    expect(res.data?.rows.map((r) => r.result)).toEqual(["failed", "failed"]);
    expect(res.data?.rows[0].message).toMatch(/another academy/);
    expect(res.data?.rows[1].message).toMatch(/isn't a student/);
    expect(repo.inviteByEmail).not.toHaveBeenCalled();
  });

  it("only ever asks about its own academy's members", async () => {
    accounts();
    await importStudentChunk([row(2, "a@x.co")], ORIGIN);
    expect(vi.mocked(repo.findMemberEmails).mock.calls.every(([academy]) => academy === AC)).toBe(true);
  });
});

describe("previewStudentImport", () => {
  it("classifies each email against the real accounts and creates nothing", async () => {
    vi.mocked(repo.findAccountByEmail).mockImplementation(async (email: string) => {
      const table: Record<string, { id: string; role: string; academyId: string | null; pending: boolean; invitedAt: string | null } | null> = {
        "new@x.co": null,
        "free@x.co": { id: ID, role: "student", academyId: null, pending: false, invitedAt: null },
        "mine@x.co": { id: ID, role: "student", academyId: AC, pending: true, invitedAt: "t" },
        "theirs@x.co": { id: ID, role: "student", academyId: OTHER_AC, pending: false, invitedAt: null },
        "staff@x.co": { id: ID, role: "mentor", academyId: AC, pending: false, invitedAt: null },
      };
      return { data: table[email] ?? null, error: null };
    });
    const res = await previewStudentImport(["new", "free", "mine", "theirs", "staff"].map((n, i) => row(i + 2, `${n}@x.co`)));
    expect(res.data?.rows.map((r) => r.outcome)).toEqual(["new", "join", "member", "blocked", "blocked"]);
    expect(repo.inviteByEmail).not.toHaveBeenCalled();
    expect(repo.addExistingStudent).not.toHaveBeenCalled();
  });

  it("does not look up rows that are already invalid", async () => {
    const res = await previewStudentImport([row(2, "bad"), row(3, "a@x.co", "")]);
    expect(res.data?.rows.map((r) => r.outcome)).toEqual(["unknown", "unknown"]);
    expect(repo.findAccountByEmail).not.toHaveBeenCalled();
  });

  it("says so, instead of guessing, when accounts cannot be checked", async () => {
    vi.mocked(repo.findAccountByEmail).mockResolvedValue({ data: null, error: { code: "admin_unavailable" } });
    const res = await previewStudentImport([row(2, "a@x.co")]);
    expect(res.data?.rows[0]).toMatchObject({ outcome: "unknown", message: expect.stringMatching(/checked when you import/) });
  });
});
