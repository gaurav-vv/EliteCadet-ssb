import { describe, expect, it } from "vitest";
import { isIsoDate, validateBatchInput } from "@/lib/academy/batch-validation";
import {
  buildBatchListHref,
  DEFAULT_BATCH_PARAMS,
  escapeLikePattern,
  formatBatchDate,
  formatCreatedMonth,
  hasActiveBatchFilters,
  parseBatchListParams,
} from "@/lib/academy/batch-list";

const MENTOR = "3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b";

describe("validateBatchInput", () => {
  it("accepts a name only and normalises whitespace", () => {
    expect(validateBatchInput({ name: "  Batch   Alpha ", startDate: null })).toEqual({
      ok: true,
      value: { name: "Batch Alpha", startDate: null },
    });
  });

  it("treats an empty date as no date", () => {
    const result = validateBatchInput({ name: "Alpha", startDate: "" });
    expect(result).toEqual({ ok: true, value: { name: "Alpha", startDate: null } });
  });

  it("rejects too-short, too-long and blank names", () => {
    expect(validateBatchInput({ name: "A", startDate: null })).toMatchObject({ ok: false, errors: { name: expect.any(String) } });
    expect(validateBatchInput({ name: "   ", startDate: null })).toMatchObject({ ok: false });
    expect(validateBatchInput({ name: "x".repeat(61), startDate: null })).toMatchObject({ ok: false });
  });

  it("rejects impossible dates", () => {
    expect(validateBatchInput({ name: "Alpha", startDate: "2026-02-30" })).toMatchObject({ ok: false, errors: { startDate: expect.any(String) } });
    expect(isIsoDate("2026-09-14")).toBe(true);
    expect(isIsoDate("14/09/2026")).toBe(false);
  });
});

describe("batch list params", () => {
  it("defaults to the active view and falls back on bad input", () => {
    expect(parseBatchListParams({})).toEqual(DEFAULT_BATCH_PARAMS);
    expect(parseBatchListParams({ status: "bogus", sort: "x", page: "0", mentor: "'; drop table" })).toEqual(DEFAULT_BATCH_PARAMS);
  });

  it("accepts a uuid mentor, 'none', and explicit status=all", () => {
    expect(parseBatchListParams({ mentor: MENTOR, status: "all", sort: "newest", q: " Alpha ", page: "3" })).toEqual({
      q: "Alpha",
      mentor: MENTOR,
      status: "all",
      sort: "newest",
      page: 3,
    });
    expect(parseBatchListParams({ mentor: "none" }).mentor).toBe("none");
  });

  it("omits defaults from URLs but keeps an explicit status=all", () => {
    expect(buildBatchListHref({})).toBe("/academy/batches");
    expect(buildBatchListHref({ status: "all", q: "Al" })).toBe("/academy/batches?q=Al&status=all");
  });

  it("counts a non-default status as an active filter", () => {
    expect(hasActiveBatchFilters(DEFAULT_BATCH_PARAMS)).toBe(false);
    expect(hasActiveBatchFilters({ ...DEFAULT_BATCH_PARAMS, status: "archived" })).toBe(true);
    expect(hasActiveBatchFilters({ ...DEFAULT_BATCH_PARAMS, q: "x" })).toBe(true);
  });

  it("escapes LIKE wildcards so search is literal", () => {
    expect(escapeLikePattern("100%_a\\b")).toBe("100\\%\\_a\\\\b");
  });

  it("formats dates without a time-zone shift", () => {
    expect(formatBatchDate("2026-09-01")).toBe("1 Sep 2026");
    expect(formatBatchDate("2026-12-31")).toBe("31 Dec 2026");
    expect(formatCreatedMonth("2026-09-24T23:44:12.000Z")).toBe("Sep 2026");
  });
});
