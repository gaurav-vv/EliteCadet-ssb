// Typed API client for the Day 2 Psychology external resource library
// (AGENTS.md §9). Backed by lib/mock/day2-resources.ts, a curated,
// human-verified dataset (see docs/day2-final-curated-resources.md) rather
// than a placeholder — a future CMS/backend would replace this file's body
// only, no caller changes.

import { getDay2Resources } from "@/lib/mock/day2-resources";
import type { Day2Resource } from "@/types/day2-resources";

export interface ApiResult<T> {
  ok: boolean;
  data?: T;
}

export async function getDay2ResourceLibrary(): Promise<ApiResult<Day2Resource[]>> {
  return { ok: true, data: getDay2Resources() };
}
