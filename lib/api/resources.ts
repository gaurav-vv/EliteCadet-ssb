// Typed API client for Resources (T037, AGENTS.md §9). Backed by
// lib/mock/resources.ts pre-backend (status.md, 2026-09-18).

import { RESOURCES, getResourceBySlug } from "@/lib/mock/resources";
import type { ResourceDetail, ResourceSummary } from "@/types/resources";

export interface ApiResult<T> {
  ok: boolean;
  data?: T;
}

export async function getResources(): Promise<ApiResult<ResourceSummary[]>> {
  return { ok: true, data: RESOURCES.map(({ slug, title, category, description }) => ({ slug, title, category, description })) };
}

export async function getResource(slug: string): Promise<ApiResult<ResourceDetail>> {
  const resource = getResourceBySlug(slug);
  if (!resource) {
    return { ok: false };
  }
  return { ok: true, data: resource };
}
