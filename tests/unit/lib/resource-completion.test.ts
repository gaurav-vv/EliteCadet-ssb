import { beforeEach, describe, expect, it } from "vitest";
import { READ_RESOURCES_KEY, readCompletedSlugs, setResourceRead } from "@/lib/student/resource-completion";

beforeEach(() => {
  window.localStorage.clear();
});

describe("resource read state", () => {
  it("starts with nothing read", () => {
    expect(readCompletedSlugs()).toEqual([]);
  });

  it("marks a resource read without duplicating it", () => {
    setResourceRead("olq-guide", true);
    setResourceRead("olq-guide", true);
    expect(readCompletedSlugs()).toEqual(["olq-guide"]);
  });

  it("un-marks a resource", () => {
    setResourceRead("olq-guide", true);
    setResourceRead("olq-guide", false);
    expect(readCompletedSlugs()).toEqual([]);
  });

  it("treats corrupted stored data as empty", () => {
    window.localStorage.setItem(READ_RESOURCES_KEY, "not-json");
    expect(readCompletedSlugs()).toEqual([]);
  });
});
