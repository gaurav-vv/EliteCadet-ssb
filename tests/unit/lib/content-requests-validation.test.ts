import { describe, expect, it } from "vitest";
import { canStaffMove, formatInr, parseFee, validateRequestInput } from "@/lib/server/content/validation";

const TODAY = "2026-10-08";
const valid = { title: "  SRT practice set ", details: "Twenty situations for NDA aspirants.", category: "psychology", type: "practice_exercise", neededBy: "" };

describe("validateRequestInput", () => {
  it("cleans a valid request", () => {
    expect(validateRequestInput(valid, TODAY)).toEqual({ ok: true, value: { title: "SRT practice set", details: "Twenty situations for NDA aspirants.", category: "psychology", type: "practice_exercise", needed_by: null } });
  });

  it("rejects short text, unknown enums and past or impossible dates", () => {
    const r = validateRequestInput({ title: "x", details: "short", category: "magic", type: "meme", neededBy: "2026-02-30" }, TODAY);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["category", "details", "neededBy", "title", "type"]);
    expect(validateRequestInput({ ...valid, neededBy: "2026-10-07" }, TODAY).ok).toBe(false);
    expect(validateRequestInput({ ...valid, neededBy: TODAY }, TODAY).ok).toBe(true);
  });
});

describe("parseFee / formatInr", () => {
  it("accepts rupees with up to 2 decimals, commas and ₹", () => {
    expect(parseFee("1500")).toBe(1500);
    expect(parseFee("₹1,500.50")).toBe(1500.5);
    expect(parseFee(2500)).toBe(2500);
  });

  it("rejects zero, negatives, junk, too many decimals and absurd amounts", () => {
    for (const v of ["0", "-10", "abc", "10.555", "100000001", "", null]) expect(parseFee(v)).toBeNull();
  });

  it("formats in Indian style", () => {
    expect(formatInr(150000)).toBe("₹1,50,000");
    expect(formatInr(1500.5)).toBe("₹1,500.50");
  });
});

describe("canStaffMove", () => {
  it("quotes only new or already-quoted requests; starts only accepted ones", () => {
    expect(canStaffMove("requested", "quoted")).toBe(true);
    expect(canStaffMove("quoted", "quoted")).toBe(true);
    expect(canStaffMove("accepted", "quoted")).toBe(false);
    expect(canStaffMove("accepted", "in_progress")).toBe(true);
    expect(canStaffMove("delivered", "in_progress")).toBe(false);
  });
});
