// Reads every row of a query that can exceed the API's response limit.
//
// Supabase's data API (PostgREST) returns at most 1,000 rows per request by default and does NOT fail when a
// query matches more: it answers HTTP 206 with the first 1,000 and the caller silently works with part of the
// data. For a dashboard that averages scores that means wrong numbers once an academy passes 1,000 rows.
// Measured on the local stack with 1,435 reviewed scores: one request returned 1,000 of 1,435.
//
// `page(from, to)` must build the SAME query with a STABLE ORDER (ties broken by a unique key) and apply
// `.range(from, to)`. Pages are read one after another until a short page arrives, so a table that fits in
// one page still costs exactly one request.
export const PAGE_SIZE = 1000;
// A safety stop, not a limit anyone should reach (50,000 rows): it keeps a runaway table from looping forever.
export const MAX_PAGES = 50;

export interface PageError {
  code?: string;
  message?: string;
}

export async function readAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: PageError | null }>,
  maxPages: number = MAX_PAGES,
): Promise<{ data: T[] | null; error: PageError | null }> {
  const rows: T[] = [];
  for (let i = 0; i < maxPages; i++) {
    const { data, error } = await page(i * PAGE_SIZE, (i + 1) * PAGE_SIZE - 1);
    if (error) return { data: null, error };
    const got = data ?? [];
    rows.push(...got);
    if (got.length < PAGE_SIZE) return { data: rows, error: null };
  }
  console.error(`[read-all] stopped after ${maxPages} pages (${rows.length} rows); the result may be incomplete`);
  return { data: rows, error: null };
}
