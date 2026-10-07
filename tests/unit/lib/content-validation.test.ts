import { describe, expect, it } from "vitest";
import { buildContentQuery, canTransition, parseContentParams, validateContentInput } from "@/lib/server/content/validation";

const valid = { title: "  Group   Discussion Framework ", description: "", category: "gto", type: "document", difficulty: "medium", targetRole: "student", visibility: "everyone", body: "How to lead a GD.", externalUrl: "" };

describe("validateContentInput", () => {
  it("cleans a valid form into DB columns", () => {
    expect(validateContentInput(valid)).toEqual({
      ok: true,
      value: { title: "Group Discussion Framework", description: null, category: "gto", type: "document", difficulty: "medium", target_role: "student", visibility: "everyone", body: "How to lead a GD.", external_url: null },
    });
  });

  it("rejects unknown enum values and a too-short title", () => {
    const r = validateContentInput({ ...valid, title: "GD", category: "astrology", type: "meme", difficulty: "insane", targetRole: "everyone", visibility: "secret" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["category", "difficulty", "targetRole", "title", "type", "visibility"]);
  });

  it("requires a body or an https link; rejects other link schemes", () => {
    expect(validateContentInput({ ...valid, body: "", externalUrl: "" }).ok).toBe(false);
    expect(validateContentInput({ ...valid, body: "", externalUrl: "https://example.com/video" }).ok).toBe(true);
    expect(validateContentInput({ ...valid, externalUrl: "javascript:alert(1)" }).ok).toBe(false);
    expect(validateContentInput({ ...valid, externalUrl: "http://example.com" }).ok).toBe(false);
  });
});

describe("canTransition", () => {
  it("allows draft ⇄ published, either → archived, archived → draft only", () => {
    expect(canTransition("draft", "published")).toBe(true);
    expect(canTransition("published", "draft")).toBe(true);
    expect(canTransition("published", "archived")).toBe(true);
    expect(canTransition("archived", "draft")).toBe(true);
    expect(canTransition("archived", "published")).toBe(false);
    expect(canTransition("draft", "draft")).toBe(false);
  });
});

describe("parseContentParams / buildContentQuery", () => {
  it("keeps valid filters, drops hostile ones, omits defaults", () => {
    expect(parseContentParams({ category: "gto", status: "published", type: "x", difficulty: "hard", page: "2" })).toEqual({ q: "", category: "gto", type: "all", status: "published", difficulty: "hard", page: 2 });
    expect(buildContentQuery({})).toBe("");
    expect(buildContentQuery({ category: "interview" })).toBe("?category=interview");
  });
});
