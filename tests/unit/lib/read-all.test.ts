// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_PAGES, PAGE_SIZE, readAll } from "@/lib/supabase/read-all";

const rowsOf = (n: number, start = 0) => Array.from({ length: n }, (_, i) => ({ id: start + i }));

afterEach(() => vi.restoreAllMocks());

describe("readAll", () => {
  it("makes exactly one request when everything fits in one page", async () => {
    const page = vi.fn(async () => ({ data: rowsOf(300), error: null }));
    const res = await readAll(page);
    expect(res.data).toHaveLength(300);
    expect(page).toHaveBeenCalledTimes(1);
    expect(page).toHaveBeenCalledWith(0, PAGE_SIZE - 1);
  });

  it("an empty table is one request and an empty list", async () => {
    const page = vi.fn(async () => ({ data: [], error: null }));
    expect(await readAll(page)).toEqual({ data: [], error: null });
    expect(page).toHaveBeenCalledTimes(1);
  });

  it("keeps reading past the API's 1,000-row limit and returns every row in order", async () => {
    const all = rowsOf(2435);
    const page = vi.fn(async (from: number, to: number) => ({ data: all.slice(from, to + 1), error: null }));
    const res = await readAll(page);
    expect(res.data).toHaveLength(2435);
    expect(res.data?.[0]).toEqual({ id: 0 });
    expect(res.data?.[2434]).toEqual({ id: 2434 });
    expect(page.mock.calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });

  it("a table of exactly one page needs one extra (empty) request to be sure", async () => {
    const all = rowsOf(PAGE_SIZE);
    const page = vi.fn(async (from: number, to: number) => ({ data: all.slice(from, to + 1), error: null }));
    const res = await readAll(page);
    expect(res.data).toHaveLength(PAGE_SIZE);
    expect(page).toHaveBeenCalledTimes(2);
  });

  it("stops at the first error and returns it, with no partial data", async () => {
    const page = vi.fn(async (from: number) => (from === 0 ? { data: rowsOf(PAGE_SIZE), error: null } : { data: null, error: { code: "57014", message: "timeout" } }));
    const res = await readAll(page);
    expect(res.data).toBeNull();
    expect(res.error).toEqual({ code: "57014", message: "timeout" });
  });

  it("stops at the page cap and says so instead of looping forever", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const page = vi.fn(async () => ({ data: rowsOf(PAGE_SIZE), error: null }));
    const res = await readAll(page, 3);
    expect(page).toHaveBeenCalledTimes(3);
    expect(res.data).toHaveLength(3 * PAGE_SIZE);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("stopped after 3 pages"));
    expect(MAX_PAGES).toBeGreaterThanOrEqual(10);
  });

  it("treats a null data field as an empty page", async () => {
    expect(await readAll(async () => ({ data: null, error: null }))).toEqual({ data: [], error: null });
  });
});
