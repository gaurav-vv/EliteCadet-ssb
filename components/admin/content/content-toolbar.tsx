"use client";

import { X } from "lucide-react";
import { FilterSelect } from "@/components/academy/shared/filter-select";
import { SearchField } from "@/components/academy/shared/search-field";
import { Button } from "@/components/ui/button";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { buildContentQuery, hasActiveContentFilters } from "@/lib/server/content/validation";
import { CONTENT_DIFFICULTIES, CONTENT_STATUSES, CONTENT_TYPES, type ContentListParams } from "@/types/content";

const opts = (all: string, map: Record<string, string>) => [{ value: "all", label: all }, ...Object.entries(map).map(([value, label]) => ({ value, label }))];

// `showStatus` is false for readers (they only ever see published content).
export function ContentToolbar({ params, showStatus = true }: { params: ContentListParams; showStatus?: boolean }) {
  const { query, onSearch, update, clearAll, isPending } = useUrlFilters({ params, buildQuery: buildContentQuery });
  const filtered = hasActiveContentFilters({ ...params, category: "all" }) || query.trim() !== "";

  return (
    <div className="flex flex-col gap-3" role="search" aria-label="Search and filter content">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchField value={query} onChange={onSearch} placeholder="Search content..." label="Search content by title or description" maxLength={80} />
        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">
          <FilterSelect label="Filter by type" value={params.type} onChange={(v) => update({ type: v as ContentListParams["type"], category: params.category })} options={opts("All types", CONTENT_TYPES)} />
          <FilterSelect label="Filter by difficulty" value={params.difficulty} onChange={(v) => update({ difficulty: v as ContentListParams["difficulty"], category: params.category })} options={opts("Any difficulty", CONTENT_DIFFICULTIES)} />
          {showStatus && (
            <FilterSelect label="Filter by status" value={params.status} onChange={(v) => update({ status: v as ContentListParams["status"], category: params.category })} options={opts("All statuses", CONTENT_STATUSES)} />
          )}
        </div>
      </div>
      <div className="flex min-h-6 items-center gap-3">
        {filtered && (
          <Button type="button" variant="ghost" size="sm" onClick={clearAll} className="h-9 gap-1 px-2 text-brand-accent">
            <X aria-hidden="true" />
            Clear filters
          </Button>
        )}
        <span role="status" aria-live="polite" className="text-[12px] text-ink-secondary">
          {isPending ? "Updating results…" : ""}
        </span>
      </div>
    </div>
  );
}
