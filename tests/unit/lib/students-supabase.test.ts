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
  getCurrentUserAndProfile: async () => ({
    user: state.profile ? { id: "u1", email: null } : null,
    profile: state.profile && { id: "u1", fullName: "Admin", ...state.profile },
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: (p: string) => state.revalidated.push(p) }));

import { createStudentAction, setStudentBatchAction, setStudentStatusAction, updateStudentAction } from "@/lib/actions/students";
import { getStudentBatchOptions, getStudentById, getStudentList, getStudentSummary, toStudentRecord } from "@/lib/api/students";
import { DEFAULT_STUDENT_PARAMS } from "@/lib/academy/student-list";

const ACADEMY = "11111111-1111-4111-8111-111111111111";
const BATCH = "3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b";
const STUDENT = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";

function queue(result: Queued["result"]): Queued {
  const entry: Queued = { table: "", calls: [], result };
  state.queue.push(entry);
  return entry;
}

beforeEach(() => {
  state.queue = [];
  state.revalidated = [];
  state.profile = { role: "academy_admin", academyId: ACADEMY };
});

describe("createStudentAction", () => {
  it("rejects non-admins without touching the database", async () => {
    state.profile = { role: "mentor", academyId: ACADEMY };
    expect(await createStudentAction({ fullName: "Priya", batchId: null, status: "active" })).toMatchObject({ ok: false, error: { code: "unauthorized" } });
    expect(state.queue).toHaveLength(0);
  });

  it("validates on the server (empty name) and writes nothing", async () => {
    const result = await createStudentAction({ fullName: "   ", batchId: null, status: "active" });
    expect(result).toMatchObject({ ok: false, error: { code: "validation_error", fieldErrors: { fullName: expect.any(String) } } });
    expect(state.revalidated).toEqual([]);
  });

  it("inserts into the admin's own academy and reports success only after the write", async () => {
    const insert = queue({ data: { id: STUDENT, full_name: "Priya Nair" }, error: null });
    const result = await createStudentAction({ fullName: " Priya   Nair ", batchId: null, status: "active" });

    expect(result).toEqual({ ok: true, data: { id: STUDENT, fullName: "Priya Nair" } });
    expect(insert.table).toBe("academy_students");
    expect(insert.calls[0]).toEqual(["insert", [{ academy_id: ACADEMY, full_name: "Priya Nair", batch_id: null, status: "active" }]]);
    expect(state.revalidated).toEqual(expect.arrayContaining(["/academy/students", "/academy"]));
  });

  it("takes the academy from the session, never from input", async () => {
    const insert = queue({ data: { id: STUDENT, full_name: "Priya" }, error: null });
    await createStudentAction({ fullName: "Priya", batchId: null, status: "active", academyId: "22222222-2222-4222-8222-222222222222" } as never);
    expect((insert.calls[0][1][0] as Record<string, unknown>).academy_id).toBe(ACADEMY);
  });

  it("checks the batch belongs to the academy and is active before inserting", async () => {
    const lookup = queue({ data: null, error: null }); // maybeSingle -> no such active batch here
    const result = await createStudentAction({ fullName: "Priya", batchId: BATCH, status: "active" });
    expect(result).toMatchObject({ ok: false, error: { fieldErrors: { batchId: expect.any(String) } } });
    expect(lookup.table).toBe("batches");
    expect(lookup.calls).toContainEqual(["eq", ["academy_id", ACADEMY]]);
    expect(lookup.calls).toContainEqual(["eq", ["status", "active"]]);
    expect(state.queue).toHaveLength(0); // no insert attempted
  });

  it("maps a foreign-key violation (cross-academy batch) to a batch error and no success", async () => {
    queue({ data: { id: BATCH }, error: null }); // lookup passes
    queue({ data: null, error: { code: "23503", message: "fk" } });
    const result = await createStudentAction({ fullName: "Priya", batchId: BATCH, status: "active" });
    expect(result).toMatchObject({ ok: false, error: { code: "validation_error", fieldErrors: { batchId: expect.any(String) } } });
    expect(state.revalidated).toEqual([]);
  });

  it("surfaces a missing-table error with setup guidance", async () => {
    queue({ data: null, error: { code: "PGRST205", message: "schema cache" } });
    const result = await createStudentAction({ fullName: "Priya", batchId: null, status: "active" });
    expect(result.error?.message).toContain("0004_academy_students.sql");
  });
});

describe("updateStudentAction / setStudentBatchAction / setStudentStatusAction", () => {
  it("scopes updates by id AND academy, and returns not_found when no row matched", async () => {
    const update = queue({ data: [], error: null });
    const result = await updateStudentAction(STUDENT, { fullName: "Priya", batchId: null, status: "active" });
    expect(result).toMatchObject({ ok: false, error: { code: "not_found" } });
    expect(update.calls).toContainEqual(["eq", ["id", STUDENT]]);
    expect(update.calls).toContainEqual(["eq", ["academy_id", ACADEMY]]);
    expect(state.revalidated).toEqual([]);
  });

  it("updates and revalidates when a row matched", async () => {
    const update = queue({ data: [{ id: STUDENT }], error: null });
    expect(await updateStudentAction(STUDENT, { fullName: "Priya N", batchId: null, status: "inactive" })).toEqual({ ok: true, data: null });
    expect(update.calls[0]).toEqual(["update", [{ full_name: "Priya N", batch_id: null, status: "inactive" }]]);
    expect(state.revalidated).toContain(`/academy/students/${STUDENT}`);
  });

  it("allows keeping a student in their existing (even archived) batch, but not moving to a non-active one", async () => {
    queue({ data: { batch_id: BATCH }, error: null }); // current batch is the same -> no assignable check
    queue({ data: [{ id: STUDENT }], error: null });
    expect((await updateStudentAction(STUDENT, { fullName: "Priya", batchId: BATCH, status: "active" })).ok).toBe(true);

    const other = "5c4d3e2f-1a0b-4c9d-8e7f-6a5b4c3d2e1f";
    queue({ data: { batch_id: BATCH }, error: null }); // moving to `other`...
    queue({ data: null, error: null }); // ...which is not an active batch of this academy
    expect(await updateStudentAction(STUDENT, { fullName: "Priya", batchId: other, status: "active" })).toMatchObject({ ok: false, error: { fieldErrors: { batchId: expect.any(String) } } });
  });

  it("moves a student by changing only batch_id", async () => {
    queue({ data: { id: BATCH }, error: null }); // batch is assignable
    const update = queue({ data: [{ id: STUDENT }], error: null });
    expect((await setStudentBatchAction(STUDENT, BATCH)).ok).toBe(true);
    expect(update.calls[0]).toEqual(["update", [{ batch_id: BATCH }]]);
  });

  it("removes a student from their batch with null and needs no batch lookup", async () => {
    const update = queue({ data: [{ id: STUDENT }], error: null });
    expect((await setStudentBatchAction(STUDENT, null)).ok).toBe(true);
    expect(update.calls[0]).toEqual(["update", [{ batch_id: null }]]);
  });

  it("changes status only, never deletes", async () => {
    const update = queue({ data: [{ id: STUDENT }], error: null });
    expect((await setStudentStatusAction(STUDENT, "inactive")).ok).toBe(true);
    expect(update.calls[0]).toEqual(["update", [{ status: "inactive" }]]);
    expect(update.calls.map(([m]) => m)).not.toContain("delete");
  });

  it("rejects ids that are not UUIDs before querying", async () => {
    expect(await setStudentStatusAction("priya-nair", "inactive")).toMatchObject({ ok: false, error: { code: "not_found" } });
    expect(await updateStudentAction("priya-nair", { fullName: "Priya", batchId: null, status: "active" })).toMatchObject({ ok: false, error: { code: "not_found" } });
    expect(state.queue).toHaveLength(0);
  });
});

describe("getStudentList", () => {
  it("applies academy scope, search, status, batch, sort and the page range in the query", async () => {
    const list = queue({ data: [], error: null, count: 0 });
    await getStudentList({ ...DEFAULT_STUDENT_PARAMS, q: "Pri_ya", status: "inactive", batch: BATCH, sort: "newest", page: 1 });

    expect(list.table).toBe("academy_students");
    expect(list.calls).toContainEqual(["eq", ["academy_id", ACADEMY]]);
    expect(list.calls).toContainEqual(["eq", ["status", "inactive"]]);
    expect(list.calls).toContainEqual(["eq", ["batch_id", BATCH]]);
    expect(list.calls).toContainEqual(["ilike", ["full_name", "%Pri\\_ya%"]]);
    expect(list.calls).toContainEqual(["order", ["created_at", { ascending: false }]]);
    expect(list.calls).toContainEqual(["range", [0, 19]]);
  });

  it("filters 'no batch' with IS NULL and skips the status filter for 'all'", async () => {
    const list = queue({ data: [], error: null, count: 0 });
    await getStudentList({ ...DEFAULT_STUDENT_PARAMS, batch: "none" });
    expect(list.calls).toContainEqual(["is", ["batch_id", null]]);
    expect(list.calls.filter(([m, a]) => m === "eq" && (a as string[])[0] === "status")).toHaveLength(0);
  });

  it("maps rows (with the joined batch name) and paginates from the exact count", async () => {
    queue({
      data: [{ id: STUDENT, full_name: "Priya Nair", status: "active", batch_id: BATCH, created_at: "2026-09-01T00:00:00Z", batch: { name: "Batch Alpha" } }],
      error: null,
      count: 45,
    });
    const result = await getStudentList(DEFAULT_STUDENT_PARAMS);
    expect(result.data).toMatchObject({ total: 45, pageCount: 3, page: 1 });
    expect(result.data?.rows[0]).toEqual({ id: STUDENT, fullName: "Priya Nair", status: "active", batchId: BATCH, batchName: "Batch Alpha", createdAt: "2026-09-01T00:00:00Z" });
  });

  it("returns an error (never an empty list) when the database fails, and rejects non-admins", async () => {
    queue({ data: null, error: { code: "PGRST205" }, count: null });
    const failed = await getStudentList(DEFAULT_STUDENT_PARAMS);
    expect(failed.ok).toBe(false);
    expect(failed.error?.code).toBe("not_set_up");

    queue({ data: null, error: { code: "XX000" }, count: null });
    expect((await getStudentList(DEFAULT_STUDENT_PARAMS)).error?.code).toBe("server_error");

    state.profile = { role: "student", academyId: ACADEMY };
    expect((await getStudentList(DEFAULT_STUDENT_PARAMS)).error?.code).toBe("unauthorized");
  });
});

describe("getStudentSummary / getStudentById / getStudentBatchOptions", () => {
  it("derives the three counts from three count queries (GET, so errors are not swallowed)", async () => {
    queue({ count: 12, error: null });
    queue({ count: 9, error: null });
    queue({ count: 4, error: null });
    expect((await getStudentSummary()).data).toEqual({ total: 12, active: 9, withoutBatch: 4 });
  });

  it("looks a student up by uuid within the academy, and 404s a non-uuid without querying", async () => {
    const lookup = queue({ data: { id: STUDENT, full_name: "Priya", status: "active", batch_id: null, created_at: "2026-09-01T00:00:00Z", batch: null }, error: null });
    expect((await getStudentById(STUDENT)).data?.fullName).toBe("Priya");
    expect(lookup.calls).toContainEqual(["eq", ["academy_id", ACADEMY]]);
    expect((await getStudentById("priya")).error?.code).toBe("not_found");
    expect(state.queue).toHaveLength(0);
  });

  it("returns not_found when no row is visible (another academy's id looks the same as a missing one)", async () => {
    queue({ data: null, error: null });
    expect((await getStudentById(STUDENT)).error?.code).toBe("not_found");
  });

  it("lists the academy's batches for the pickers", async () => {
    const batches = queue({ data: [{ id: BATCH, name: "Alpha", status: "active" }, { id: "x", name: "bad", status: "weird" }], error: null });
    const result = await getStudentBatchOptions();
    expect(batches.table).toBe("batches");
    expect(batches.calls).toContainEqual(["eq", ["academy_id", ACADEMY]]);
    expect(result.data).toEqual([{ id: BATCH, name: "Alpha", status: "active" }]);
  });
});

describe("toStudentRecord", () => {
  it("drops malformed rows instead of rendering them", () => {
    expect(toStudentRecord(null)).toBeNull();
    expect(toStudentRecord({ id: 1 })).toBeNull();
    expect(toStudentRecord({ id: STUDENT, full_name: "A", created_at: "2026-09-01", status: "pending" })).toBeNull();
  });
});
