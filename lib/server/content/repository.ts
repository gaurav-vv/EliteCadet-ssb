// Content data access — signed-in user's own session (anon key + RLS). RLS
// decides what each reader may see (can_read_content in 0008); the service
// role is never used here.

import { createClient } from "@/lib/supabase/server";
import { sanitizeSearch } from "@/lib/server/users/validation";
import { CONTENT_PAGE_SIZE, isAudience, isCategory, isContentStatus, isContentType, isDifficulty, isVisibility, type CleanContentInput } from "@/lib/server/content/validation";
import type { DbResult } from "@/lib/server/users/repository";
import type { ContentAssignment, ContentCategory, ContentCategoryCounts, ContentListParams, ContentRecord, ContentStatus } from "@/types/content";

const COLUMNS = "id, title, description, category, type, difficulty, target_role, visibility, status, body, external_url, created_at, updated_at, published_at";

const text = (v: unknown) => (typeof v === "string" && v ? v : null);

export function toContent(row: unknown): ContentRecord | null {
  if (typeof row !== "object" || row === null) return null;
  const r = row as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.title !== "string" || typeof r.created_at !== "string") return null;
  if (!isCategory(r.category) || !isContentType(r.type) || !isContentStatus(r.status)) return null;
  return {
    id: r.id,
    title: r.title,
    description: text(r.description),
    category: r.category,
    type: r.type,
    difficulty: isDifficulty(r.difficulty) ? r.difficulty : "medium",
    targetRole: isAudience(r.target_role) ? r.target_role : "student",
    visibility: isVisibility(r.visibility) ? r.visibility : "everyone",
    status: r.status,
    body: text(r.body),
    externalUrl: text(r.external_url),
    createdAt: r.created_at,
    updatedAt: typeof r.updated_at === "string" ? r.updated_at : r.created_at,
    publishedAt: text(r.published_at),
  };
}

export async function findContents(params: ContentListParams, page: number, opts: { publishedOnly?: boolean } = {}): Promise<DbResult<{ rows: ContentRecord[]; total: number }>> {
  const supabase = await createClient();
  let query = supabase.from("contents").select(COLUMNS, { count: "exact" }).eq("owner_type", "platform");
  if (opts.publishedOnly) query = query.eq("status", "published");
  else if (params.status !== "all") query = query.eq("status", params.status);
  if (params.category !== "all") query = query.eq("category", params.category);
  if (params.type !== "all") query = query.eq("type", params.type);
  if (params.difficulty !== "all") query = query.eq("difficulty", params.difficulty);
  const q = sanitizeSearch(params.q);
  if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  query = opts.publishedOnly ? query.order("published_at", { ascending: false, nullsFirst: false }) : query.order("updated_at", { ascending: false });
  const from = (page - 1) * CONTENT_PAGE_SIZE;
  const { data, count, error } = await query.order("id", { ascending: true }).range(from, from + CONTENT_PAGE_SIZE - 1);
  if (error) return { data: null, error };
  return { data: { rows: (data ?? []).map(toContent).filter((c): c is ContentRecord => c !== null), total: count ?? 0 }, error: null };
}

const CATEGORY_KEYS: ContentCategory[] = ["psychology", "gto", "interview", "communication", "current_affairs", "general"];

// Head-only counts per category (Content Library tabs).
export async function countByCategory(status?: ContentStatus): Promise<DbResult<ContentCategoryCounts>> {
  const supabase = await createClient();
  const base = () => {
    let q = supabase.from("contents").select("id", { count: "exact", head: true }).eq("owner_type", "platform");
    if (status) q = q.eq("status", status);
    return q;
  };
  const results = await Promise.all([base(), ...CATEGORY_KEYS.map((c) => base().eq("category", c))]);
  const failed = results.find((r) => r.error);
  if (failed?.error) return { data: null, error: failed.error };
  const counts = { all: results[0].count ?? 0 } as ContentCategoryCounts;
  CATEGORY_KEYS.forEach((c, i) => (counts[c] = results[i + 1].count ?? 0));
  return { data: counts, error: null };
}

export async function findContentById(id: string): Promise<DbResult<ContentRecord | null>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("contents").select(COLUMNS).eq("id", id).eq("owner_type", "platform").maybeSingle();
  if (error) return { data: null, error };
  return { data: data ? toContent(data) : null, error: null };
}

export async function insertContent(values: CleanContentInput, actorId: string): Promise<DbResult<{ id: string }>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contents")
    .insert({ ...values, owner_type: "platform", status: "draft", created_by: actorId, updated_by: actorId })
    .select("id")
    .single();
  if (error || !data) return { data: null, error: error ?? {} };
  return { data: { id: data.id as string }, error: null };
}

export async function updateContent(id: string, values: Partial<CleanContentInput> & { status?: ContentStatus }, actorId: string): Promise<DbResult<number>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("contents").update({ ...values, updated_by: actorId }).eq("id", id).eq("owner_type", "platform").select("id");
  if (error) return { data: null, error };
  return { data: data?.length ?? 0, error: null };
}

export async function findAssignments(contentId: string): Promise<DbResult<ContentAssignment[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_assignments")
    .select("id, academy_id, batch_id, academy:academies(name), batch:batches(name, academy:academies(name))")
    .eq("content_id", contentId)
    .order("created_at", { ascending: true });
  if (error) return { data: null, error };
  const one = (v: unknown) => (Array.isArray(v) ? v[0] : v) as Record<string, unknown> | null | undefined;
  return {
    data: (data ?? []).flatMap((row): ContentAssignment[] => {
      const r = row as Record<string, unknown>;
      if (typeof r.id !== "string") return [];
      const academy = one(r.academy);
      const batch = one(r.batch);
      const batchAcademy = one(batch?.academy);
      const label =
        typeof r.batch_id === "string"
          ? `Batch: ${String(batch?.name ?? "Unknown batch")}${batchAcademy?.name ? ` (${String(batchAcademy.name)})` : ""}`
          : `Academy: ${String(academy?.name ?? "Unknown academy")}`;
      return [{ id: r.id, academyId: typeof r.academy_id === "string" ? r.academy_id : null, batchId: typeof r.batch_id === "string" ? r.batch_id : null, label }];
    }),
    error: null,
  };
}

export async function insertAssignment(contentId: string, target: { academyId: string } | { batchId: string }, actorId: string): Promise<DbResult<null>> {
  const supabase = await createClient();
  const row = "academyId" in target ? { academy_id: target.academyId } : { batch_id: target.batchId };
  const { error } = await supabase.from("content_assignments").insert({ content_id: contentId, ...row, created_by: actorId });
  return error ? { data: null, error } : { data: null, error: null };
}

export async function deleteAssignment(contentId: string, assignmentId: string): Promise<DbResult<number>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("content_assignments").delete().eq("id", assignmentId).eq("content_id", contentId).select("id");
  if (error) return { data: null, error };
  return { data: data?.length ?? 0, error: null };
}

// Batch options across academies, for assignment pickers (super admin RLS).
export async function findBatchOptions(): Promise<DbResult<{ id: string; name: string }[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("batches").select("id, name, academy:academies(name)").eq("status", "active").order("name", { ascending: true }).limit(500);
  if (error) return { data: null, error };
  return {
    data: (data ?? []).flatMap((b) => {
      const academy = (Array.isArray(b.academy) ? b.academy[0] : b.academy) as { name?: string } | null;
      return typeof b.id === "string" && typeof b.name === "string" ? [{ id: b.id, name: academy?.name ? `${b.name} (${academy.name})` : b.name }] : [];
    }),
    error: null,
  };
}
