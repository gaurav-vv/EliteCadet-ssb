// Content data access — signed-in user's own session (anon key + RLS). RLS
// decides what each reader may see (can_read_content in 0008); the service
// role is never used here.

import { createClient } from "@/lib/supabase/server";
import { sanitizeSearch } from "@/lib/server/users/validation";
import { CONTENT_PAGE_SIZE, isAudience, isCategory, isContentStatus, isContentType, isDifficulty, isVisibility, type CleanContentInput } from "@/lib/server/content/validation";
import type { DbResult } from "@/lib/server/users/repository";
import type { ContentAssignment, ContentCategory, ContentCategoryCounts, ContentListParams, ContentRecord, ContentStatus } from "@/types/content";

const COLUMNS =
  "id, title, description, category, type, difficulty, target_role, visibility, status, body, external_url, owner_type, is_template, template_source_id, created_at, updated_at, published_at";

// Which contents a query is about. Readers pass none: RLS alone decides.
export type ContentOwner = { type: "platform" } | { type: "mentor"; id: string };

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
    ownerType: r.owner_type === "mentor" ? "mentor" : "platform",
    isTemplate: r.is_template === true,
    templateSourceId: text(r.template_source_id),
    createdAt: r.created_at,
    updatedAt: typeof r.updated_at === "string" ? r.updated_at : r.created_at,
    publishedAt: text(r.published_at),
  };
}

// Narrow a query to one owner. Typed loosely on purpose: PostgREST builder
// generics are too deep for TypeScript to thread through a helper.
function scope<Q>(query: Q, owner?: ContentOwner): Q {
  if (!owner) return query;
  type Eq = { eq: (column: string, value: string) => Q };
  if (owner.type === "platform") return (query as unknown as Eq).eq("owner_type", "platform");
  const mentorOnly = (query as unknown as Eq).eq("owner_type", "mentor");
  return (mentorOnly as unknown as Eq).eq("owner_id", owner.id);
}

export async function findContents(
  params: ContentListParams,
  page: number,
  opts: { publishedOnly?: boolean; owner?: ContentOwner; templatesOnly?: boolean } = {},
): Promise<DbResult<{ rows: ContentRecord[]; total: number }>> {
  const supabase = await createClient();
  let query = scope(supabase.from("contents").select(COLUMNS, { count: "exact" }), opts.owner);
  if (opts.templatesOnly) query = query.eq("is_template", true);
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
export async function countByCategory(status?: ContentStatus, owner: ContentOwner = { type: "platform" }): Promise<DbResult<ContentCategoryCounts>> {
  const supabase = await createClient();
  const base = () => {
    let q = scope(supabase.from("contents").select("id", { count: "exact", head: true }), owner);
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

export async function findContentById(id: string, owner?: ContentOwner): Promise<DbResult<ContentRecord | null>> {
  const supabase = await createClient();
  const { data, error } = await scope(supabase.from("contents").select(COLUMNS).eq("id", id), owner).maybeSingle();
  if (error) return { data: null, error };
  return { data: data ? toContent(data) : null, error: null };
}

export async function insertContent(
  values: CleanContentInput & { template_source_id?: string | null },
  actorId: string,
  owner: ContentOwner = { type: "platform" },
): Promise<DbResult<{ id: string }>> {
  const supabase = await createClient();
  const ownership = owner.type === "platform" ? { owner_type: "platform" } : { owner_type: "mentor", owner_id: owner.id };
  const { data, error } = await supabase
    .from("contents")
    .insert({ ...values, ...ownership, status: "draft", created_by: actorId, updated_by: actorId })
    .select("id")
    .single();
  if (error || !data) return { data: null, error: error ?? {} };
  return { data: { id: data.id as string }, error: null };
}

export async function updateContent(
  id: string,
  values: Partial<CleanContentInput> & { status?: ContentStatus },
  actorId: string,
  owner: ContentOwner = { type: "platform" },
): Promise<DbResult<number>> {
  const supabase = await createClient();
  const { data, error } = await scope(supabase.from("contents").update({ ...values, updated_by: actorId }).eq("id", id), owner).select("id");
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

// Platform content (not archived) as options, e.g. to deliver a request.
export async function findPlatformContentOptions(): Promise<DbResult<{ id: string; name: string }[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("contents").select("id, title").eq("owner_type", "platform").neq("status", "archived").order("updated_at", { ascending: false }).limit(500);
  if (error) return { data: null, error };
  return { data: (data ?? []).flatMap((c) => (typeof c.id === "string" && typeof c.title === "string" ? [{ id: c.id, name: c.title }] : [])), error: null };
}
