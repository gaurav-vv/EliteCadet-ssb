// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), queue: [] as unknown[], calls: [] as { table: string; q: Record<string, ReturnType<typeof vi.fn>> }[] }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: db.from, rpc: db.rpc }) }));
vi.mock("@/lib/server/auth/guard", () => ({ getActor: vi.fn() }));
vi.mock("@/lib/server/academy-people/service", () => ({ getMyMentee: vi.fn() }));

import { getMyMentee } from "@/lib/server/academy-people/service";
import { getActor } from "@/lib/server/auth/guard";
import * as service from "@/lib/server/practice/service";

const ME = "11111111-1111-4111-8111-111111111111";
const ITEM = "22222222-2222-4222-8222-222222222222";
const OTHER = "33333333-3333-4333-8333-333333333333";
const KEY = "2b7d9c1e-0000-4000-8000-000000000000";
const actor = (role: string) => ({ id: ME, email: null, profile: { id: ME, role, fullName: "A", academyId: "acad", status: "active" } });
const mcqRow = { id: ITEM, key: "oir-t-1", position: 1, prompt: "2, 4, 8, ?", options: [{ id: "oir-t-1-a", label: "12" }, { id: "oir-t-1-b", label: "16" }], correct_option_id: "oir-t-1-b", guidance: null, active: true };

function builder(table: string) {
  const result = db.queue.shift() ?? { data: [], error: null };
  const q: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ["select", "insert", "update", "upsert", "eq", "in", "gte", "order", "limit"]) q[m] = vi.fn(() => q);
  q.single = vi.fn(async () => result);
  q.maybeSingle = vi.fn(async () => result);
  (q as unknown as { then: unknown }).then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  db.calls.push({ table, q });
  return q;
}

beforeEach(() => {
  vi.mocked(getActor).mockReset();
  vi.mocked(getMyMentee).mockReset();
  db.queue = [];
  db.calls = [];
  db.from.mockReset();
  db.rpc.mockReset();
  db.from.mockImplementation((t: string) => builder(t));
});

describe("role scope", () => {
  it("only students save or submit; only super admins edit banks", async () => {
    vi.mocked(getActor).mockResolvedValue(actor("mentor") as never);
    expect((await service.saveMyAnswer("tat", "tat-1", { text: "x" })).error?.code).toBe("unauthorized");
    expect((await service.submitMyAttempt("tat", "test", KEY, [{ key: "tat-1" }])).error?.code).toBe("unauthorized");
    expect((await service.getMyAnswers("tat")).error?.code).toBe("unauthorized");
    expect((await service.createItem("tat", { prompt: "x" })).error?.code).toBe("unauthorized");
    expect((await service.moveItem(ITEM, "up")).error?.code).toBe("unauthorized");
    vi.mocked(getActor).mockResolvedValue(actor("student") as never);
    expect((await service.listBanksAdmin()).error?.code).toBe("unauthorized");
    expect((await service.setItemActive(ITEM, false)).error?.code).toBe("unauthorized");
    expect(db.from).not.toHaveBeenCalled();
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("a signed-out caller can't read a bank", async () => {
    vi.mocked(getActor).mockResolvedValue(null);
    expect((await service.getBank("tat")).error?.code).toBe("unauthorized");
  });
});

describe("getBank", () => {
  beforeEach(() => vi.mocked(getActor).mockResolvedValue(actor("student") as never));

  it("exposes item keys as ids, active items only, in order", async () => {
    db.queue.push({ data: { slug: "oir-verbal-test", title: "OIR", item_kind: "mcq" }, error: null }, { data: [mcqRow], error: null });
    const res = await service.getBank("oir-verbal-test");
    expect(res.data?.items).toEqual([{ id: "oir-t-1", prompt: "2, 4, 8, ?", options: mcqRow.options, correctOptionId: "oir-t-1-b" }]);
    expect(db.calls[1].q.eq).toHaveBeenCalledWith("active", true);
    expect(db.calls[1].q.order).toHaveBeenCalledWith("position");
  });

  it("never sends the correct options for a timed test", async () => {
    db.queue.push({ data: { slug: "oir-verbal-test", title: "OIR", item_kind: "mcq" }, error: null }, { data: [mcqRow], error: null });
    const res = await service.getBank("oir-verbal-test", { forTest: true });
    expect(res.data?.items[0]).not.toHaveProperty("correctOptionId");
  });

  it("unknown or malformed slugs are not found", async () => {
    expect((await service.getBank("../etc")).error?.code).toBe("not_found");
    db.queue.push({ data: null, error: null }, { data: [], error: null });
    expect((await service.getBank("nope")).error?.code).toBe("not_found");
  });
});

describe("saving answers", () => {
  beforeEach(() => vi.mocked(getActor).mockResolvedValue(actor("student") as never));

  it("upserts only the sent fields against the caller's own row", async () => {
    db.queue.push({ data: { id: ITEM }, error: null }, { data: { updated_at: "t" }, error: null });
    const res = await service.saveMyAnswer("tat", "tat-1", { text: "A story" });
    expect(res.ok).toBe(true);
    expect(db.calls[1].q.upsert).toHaveBeenCalledWith({ student_id: ME, item_id: ITEM, answer_text: "A story" }, { onConflict: "student_id,item_id" });
  });

  it("refuses an inactive/unknown question and invalid input before writing", async () => {
    expect((await service.saveMyAnswer("tat", "tat-1", { text: "x".repeat(5001) })).error?.code).toBe("validation_error");
    db.queue.push({ data: null, error: null });
    expect((await service.saveMyAnswer("tat", "tat-99", { done: true })).error?.code).toBe("not_found");
    expect(db.calls.some((c) => c.q.upsert.mock.calls.length > 0)).toBe(false);
  });
});

describe("submitting attempts", () => {
  beforeEach(() => vi.mocked(getActor).mockResolvedValue(actor("student") as never));

  it("maps keys to item ids; the score comes from the database", async () => {
    db.queue.push({ data: [{ id: ITEM, key: "oir-t-1" }], error: null }, { data: { id: OTHER, correct: 1, total: 1, submitted_at: "t" }, error: null });
    const res = await service.submitMyAttempt("oir-verbal-test", "test", KEY, [{ key: "oir-t-1", optionId: "oir-t-1-b" }]);
    expect(res.data).toEqual({ id: OTHER, correct: 1, total: 1, submittedAt: "t" });
    expect(db.calls[1].q.insert).toHaveBeenCalledWith({ student_id: ME, bank_slug: "oir-verbal-test", mode: "test", client_key: KEY, answers: [{ itemId: ITEM, optionId: "oir-t-1-b" }] });
  });

  it("a retried submit returns the original attempt instead of a duplicate", async () => {
    db.queue.push({ data: [{ id: ITEM, key: "tat-1" }], error: null }, { data: null, error: { code: "23505" } }, { data: { id: OTHER, correct: null, total: 1, submitted_at: "t0" }, error: null });
    const res = await service.submitMyAttempt("tat", "test", KEY, [{ key: "tat-1", response: "Story" }]);
    expect(res.data?.id).toBe(OTHER);
    expect(db.calls[2].q.eq).toHaveBeenCalledWith("client_key", KEY);
  });

  it("refuses a question that's no longer in the bank, and PIQ prompts outside mock runs", async () => {
    db.queue.push({ data: [], error: null });
    expect((await service.submitMyAttempt("tat", "test", KEY, [{ key: "gone" }])).error?.message).toMatch(/reload/);
    expect((await service.submitMyAttempt("tat", "test", KEY, [{ prompt: "About Pune?" }])).error?.code).toBe("validation_error");
  });
});

describe("mentor view", () => {
  it("is not found for a student outside the mentor's batches", async () => {
    vi.mocked(getMyMentee).mockResolvedValue({ ok: false, error: { code: "not_found", message: "x" } });
    expect((await service.getMenteePractice(OTHER)).error?.code).toBe("not_found");
    expect(db.from).not.toHaveBeenCalled();
  });
});

describe("Super Admin editing", () => {
  beforeEach(() => vi.mocked(getActor).mockResolvedValue(actor("super_admin") as never));

  it("creates an item with a generated key and options tied to it", async () => {
    db.queue.push({ data: { item_kind: "mcq" }, error: null }, { data: { id: ITEM }, error: null });
    const res = await service.createItem("oir-verbal-test", { prompt: "Odd one out?", options: "Rifle\nHelmet", correct: "2" });
    expect(res.ok).toBe(true);
    const row = db.calls[1].q.insert.mock.calls[0][0];
    expect(row.key).toMatch(/^oir-verbal-test-[0-9a-f]{8}$/);
    expect(row.options).toEqual([{ id: `${row.key}-a`, label: "Rifle" }, { id: `${row.key}-b`, label: "Helmet" }]);
    expect(row.correct_option_id).toBe(`${row.key}-b`);
    expect(row.created_by).toBe(ME);
  });

  it("returns field errors instead of writing", async () => {
    db.queue.push({ data: { item_kind: "mcq" }, error: null });
    const res = await service.createItem("oir-verbal-test", { prompt: "", options: "One", correct: "1" });
    expect(res.fieldErrors).toMatchObject({ prompt: expect.any(String), options: expect.any(String) });
    expect(db.calls).toHaveLength(1);
  });

  it("reorders through the atomic database function", async () => {
    db.rpc.mockResolvedValue({ data: null, error: null });
    expect((await service.moveItem(ITEM, "up")).ok).toBe(true);
    expect(db.rpc).toHaveBeenCalledWith("practice_move_item", { p_item: ITEM, p_direction: -1 });
  });
});
