import { beforeEach, describe, expect, it, vi } from "vitest";

// A chainable stand-in for the Supabase query builder: every method records its
// call and returns the same object; awaiting it yields the queued result. This
// lets us assert exactly which filters/writes reach the database.
type Call = [string, unknown[]];
interface Queued {
  table: string;
  calls: Call[];
  result: { data?: unknown; error?: { code?: string; message?: string } | null; count?: number | null };
}

const state = vi.hoisted(() => ({
  queue: [] as Queued[],
  profile: null as null | { role: string; academyId: string | null },
  revalidated: [] as string[],
}));

function makeBuilder(entry: Queued) {
  const q: Record<string | symbol, unknown> = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "then") return (resolve: (v: unknown) => unknown) => Promise.resolve(entry.result).then(resolve);
        return (...args: unknown[]) => {
          entry.calls.push([String(prop), args]);
          return q;
        };
      },
    },
  );
  return q;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from(table: string) {
      const entry = state.queue.shift();
      if (!entry) throw new Error(`Unexpected query on ${table}`);
      entry.table = table;
      return makeBuilder(entry);
    },
  }),
}));
vi.mock("@/lib/auth/session", () => ({
  getCurrentUserAndProfile: async () => ({ user: state.profile ? { id: "u1", email: null } : null, profile: state.profile && { id: "u1", fullName: "Admin", status: "active", ...state.profile } }),
}));
vi.mock("next/cache", () => ({ revalidatePath: (p: string) => state.revalidated.push(p) }));

import { addBatchMentorAction, createBatchAction, removeBatchMentorAction, setBatchStatusAction, setStudentBatchAction, updateBatchAction } from "@/lib/actions/batches";
import { getBatchList, getBatchSummary, toBatchRecord } from "@/lib/api/batches";
import { DEFAULT_BATCH_PARAMS } from "@/lib/academy/batch-list";

const ACADEMY = "11111111-1111-4111-8111-111111111111";
const MENTOR = "3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b";
const BATCH = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";

function queue(result: Queued["result"]): Queued {
  const entry: Queued = { table: "", calls: [], result };
  state.queue.push(entry);
  return entry;
}
const names = (e: Queued) => e.calls.map(([m]) => m);

beforeEach(() => {
  state.queue = [];
  state.revalidated = [];
  state.profile = { role: "academy_admin", academyId: ACADEMY };
});

describe("createBatchAction", () => {
  it("rejects non-admins without touching the database", async () => {
    state.profile = { role: "mentor", academyId: ACADEMY };
    const result = await createBatchAction({ name: "Alpha", startDate: null });
    expect(result).toMatchObject({ ok: false, error: { code: "unauthorized" } });
    expect(state.queue).toHaveLength(0);
  });

  it("validates on the server and returns field errors with no write", async () => {
    const result = await createBatchAction({ name: "A", startDate: null });
    expect(result).toMatchObject({ ok: false, error: { code: "validation_error", fieldErrors: { name: expect.any(String) } } });
    expect(state.revalidated).toEqual([]);
  });

  it("inserts into the admin's academy and reports success only after the write succeeds", async () => {
    const insert = queue({ data: { id: BATCH, name: "Alpha" }, error: null });
    const result = await createBatchAction({ name: " Alpha ", startDate: "2026-09-14" });

    expect(result).toEqual({ ok: true, data: { id: BATCH, name: "Alpha" } });
    expect(insert.table).toBe("batches");
    expect(insert.calls[0]).toEqual(["insert", [{ academy_id: ACADEMY, name: "Alpha", start_date: "2026-09-14" }]]);
    expect(state.revalidated).toContain("/academy/batches");
  });

  it("maps a duplicate-name violation to a field error and does not claim success", async () => {
    queue({ data: null, error: { code: "23505", message: "duplicate key" } });
    const result = await createBatchAction({ name: "Alpha", startDate: null });
    expect(result).toMatchObject({ ok: false, error: { code: "validation_error", fieldErrors: { name: "A batch with this name already exists." } } });
    expect(state.revalidated).toEqual([]);
  });

  it("surfaces a missing-table error with setup guidance", async () => {
    queue({ data: null, error: { code: "PGRST205", message: "schema cache" } });
    const result = await createBatchAction({ name: "Alpha", startDate: null });
    expect(result.error?.message).toContain("0003_batches.sql");
  });

});

describe("updateBatchAction / setBatchStatusAction", () => {
  it("scopes the update to the academy and returns not_found when no row matched", async () => {
    const update = queue({ data: [], error: null });
    const result = await updateBatchAction(BATCH, { name: "Bravo", startDate: null });
    expect(result).toMatchObject({ ok: false, error: { code: "not_found" } });
    expect(update.calls).toContainEqual(["eq", ["academy_id", ACADEMY]]);
    expect(state.revalidated).toEqual([]);
  });

  it("updates and revalidates when a row matched", async () => {
    queue({ data: [{ id: BATCH }], error: null });
    expect(await updateBatchAction(BATCH, { name: "Bravo", startDate: null })).toEqual({ ok: true, data: null });
    expect(state.revalidated).toContain("/academy/batches");
  });

  it("archives by changing status (never deletes)", async () => {
    const update = queue({ data: [{ id: BATCH }], error: null });
    expect((await setBatchStatusAction(BATCH, "archived")).ok).toBe(true);
    expect(update.calls[0]).toEqual(["update", [{ status: "archived" }]]);
    expect(names(update)).not.toContain("delete");
  });

  it("rejects an id that is not a uuid before querying", async () => {
    expect(await setBatchStatusAction("not-a-uuid", "archived")).toMatchObject({ ok: false, error: { code: "not_found" } });
    expect(state.queue).toHaveLength(0);
  });
});

describe("getBatchList", () => {
  it("applies search, mentor, status, sort and the page range in the query", async () => {
    const list = queue({ data: [], error: null, count: 0 });
    await getBatchList({ ...DEFAULT_BATCH_PARAMS, q: "Alp_ha", mentor: MENTOR, status: "archived", sort: "newest", page: 1 });

    expect(list.table).toBe("batch_overview");
    expect(list.calls).toContainEqual(["eq", ["academy_id", ACADEMY]]);
    expect(list.calls).toContainEqual(["eq", ["status", "archived"]]);
    expect(list.calls).toContainEqual(["contains", ["mentor_ids", [MENTOR]]]);
    expect(list.calls).toContainEqual(["ilike", ["name", "%Alp\\_ha%"]]);
    expect(list.calls).toContainEqual(["order", ["created_at", { ascending: false }]]);
    expect(list.calls).toContainEqual(["range", [0, 19]]);
  });

  it("filters 'no mentor' by mentor_count = 0 and skips the status filter for 'all'", async () => {
    const list = queue({ data: [], error: null, count: 0 });
    await getBatchList({ ...DEFAULT_BATCH_PARAMS, mentor: "none", status: "all" });
    expect(list.calls).toContainEqual(["eq", ["mentor_count", 0]]);
    expect(list.calls.filter(([m, a]) => m === "eq" && (a as string[])[0] === "status")).toHaveLength(0);
  });

  it("maps rows (mentors list + student count) and paginates from the exact count", async () => {
    queue({
      data: [{ id: BATCH, name: "Alpha", status: "active", start_date: "2026-09-14", created_at: "2026-09-01T00:00:00Z", mentors: [{ id: MENTOR, name: "Kavita Sharma" }, { id: "bad" }, null], student_count: 12 }],
      error: null,
      count: 41,
    });
    const result = await getBatchList(DEFAULT_BATCH_PARAMS);
    expect(result.data).toMatchObject({ total: 41, pageCount: 3, page: 1 });
    expect(result.data?.rows[0]).toEqual({
      id: BATCH,
      name: "Alpha",
      status: "active",
      startDate: "2026-09-14",
      createdAt: "2026-09-01T00:00:00Z",
      mentors: [{ id: MENTOR, name: "Kavita Sharma" }, { id: "bad", name: "Unnamed mentor" }],
      studentCount: 12,
    });
  });

  it("returns a friendly error when the table is missing, and rejects non-admins", async () => {
    queue({ data: null, error: { code: "PGRST205" }, count: null });
    expect((await getBatchList(DEFAULT_BATCH_PARAMS)).error?.code).toBe("not_set_up");
    state.profile = { role: "student", academyId: ACADEMY };
    expect((await getBatchList(DEFAULT_BATCH_PARAMS)).error?.code).toBe("unauthorized");
  });
});

describe("getBatchSummary", () => {
  it("derives the three counts from three head-only count queries", async () => {
    queue({ count: 7, error: null });
    queue({ count: 5, error: null });
    queue({ count: 2, error: null });
    const result = await getBatchSummary();
    expect(result.data).toEqual({ total: 7, active: 5, withoutMentor: 2 });
  });
});

describe("toBatchRecord", () => {
  it("drops malformed rows instead of rendering them", () => {
    expect(toBatchRecord(null)).toBeNull();
    expect(toBatchRecord({ id: 1, name: "x" })).toBeNull();
    expect(toBatchRecord({ id: BATCH, name: "A", created_at: "2026-09-01", status: "weird" })).toBeNull();
  });
});

const STUDENT = "5b6c7d8e-9f0a-4b1c-8d2e-3f4a5b6c7d8e";

describe("batch membership actions", () => {
  it("refuse non-admins and malformed ids without querying", async () => {
    state.profile = { role: "mentor", academyId: ACADEMY };
    expect((await addBatchMentorAction(BATCH, MENTOR)).error?.code).toBe("unauthorized");
    state.profile = { role: "academy_admin", academyId: ACADEMY };
    expect((await addBatchMentorAction("x", MENTOR)).error?.code).toBe("validation_error");
    expect((await setStudentBatchAction("x", BATCH)).error?.code).toBe("validation_error");
    expect(state.queue).toHaveLength(0);
  });

  it("assigns a mentor only after confirming the batch and mentor are in the admin's academy", async () => {
    const batch = queue({ data: { id: BATCH }, error: null });
    const mentor = queue({ data: { id: MENTOR }, error: null });
    const insert = queue({ data: null, error: null });
    expect(await addBatchMentorAction(BATCH, MENTOR)).toEqual({ ok: true, data: null });
    expect(batch.calls).toContainEqual(["eq", ["academy_id", ACADEMY]]);
    expect(mentor.calls).toContainEqual(["eq", ["role", "mentor"]]);
    expect(insert.table).toBe("batch_mentors");
    expect(insert.calls[0]).toEqual(["insert", [{ batch_id: BATCH, mentor_id: MENTOR, assigned_by: "u1" }]]);
  });

  it("refuses another academy's batch as not found, with no write", async () => {
    queue({ data: null, error: null });
    expect((await addBatchMentorAction(BATCH, MENTOR)).error?.code).toBe("not_found");
    expect(state.queue).toHaveLength(0);
  });

  it("maps the integrity trigger (wrong role / academy) to a clear message", async () => {
    queue({ data: { id: BATCH }, error: null });
    queue({ data: { id: MENTOR }, error: null });
    queue({ data: null, error: { code: "23514" } });
    expect((await addBatchMentorAction(BATCH, MENTOR)).error?.message).toMatch(/eligible/);
  });

  it("removes a mentor, and reports not_found when they weren't on it", async () => {
    queue({ data: [{ mentor_id: MENTOR }], error: null });
    expect((await removeBatchMentorAction(BATCH, MENTOR)).ok).toBe(true);
    queue({ data: [], error: null });
    expect((await removeBatchMentorAction(BATCH, MENTOR)).error?.code).toBe("not_found");
  });

  it("moves a student by upserting on student_id (one batch each)", async () => {
    queue({ data: { id: STUDENT }, error: null });
    queue({ data: { id: BATCH }, error: null });
    const upsert = queue({ data: null, error: null });
    expect((await setStudentBatchAction(STUDENT, BATCH)).ok).toBe(true);
    expect(upsert.table).toBe("batch_students");
    expect(upsert.calls[0]).toEqual(["upsert", [{ batch_id: BATCH, student_id: STUDENT, added_by: "u1" }, { onConflict: "student_id" }]]);
  });

  it("refuses a student outside the admin's academy", async () => {
    const lookup = queue({ data: null, error: null });
    expect((await setStudentBatchAction(STUDENT, BATCH)).error?.code).toBe("not_found");
    expect(lookup.calls).toContainEqual(["eq", ["academy_id", ACADEMY]]);
    expect(state.queue).toHaveLength(0);
  });

  it("takes a student out of their batch with null", async () => {
    queue({ data: { id: STUDENT }, error: null });
    const del = queue({ data: null, error: null });
    expect((await setStudentBatchAction(STUDENT, null)).ok).toBe(true);
    expect(names(del)).toContain("delete");
  });
});
