"use client";

import { X } from "lucide-react";
import { FilterSelect } from "@/components/academy/shared/filter-select";
import { SearchField } from "@/components/academy/shared/search-field";
import { Button } from "@/components/ui/button";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { buildBatchListQuery, hasActiveBatchFilters } from "@/lib/academy/batch-list";
import type { BatchListParams, BatchMentorOption } from "@/types/academy";

interface BatchToolbarProps {
  params: BatchListParams;
  mentors: BatchMentorOption[];
}

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
  { value: "all", label: "All statuses" },
];
const SORT_OPTIONS = [
  { value: "name", label: "Sort: Name (A–Z)" },
  { value: "newest", label: "Sort: Newest first" },
  { value: "oldest", label: "Sort: Oldest first" },
];

// Only filters/sorts backed by real columns are offered: mentor (mentor_id),
// status (status) and name/created date. (Student count isn't here: students
// aren't in Postgres yet, so there is nothing real to filter or sort by.)
export function BatchToolbar({ params, mentors }: BatchToolbarProps) {
  const { query, onSearch, update, clearAll, isPending } = useUrlFilters({ params, buildQuery: buildBatchListQuery });
  const filtered = hasActiveBatchFilters(params) || query.trim() !== "";

  return (
    <div className="flex flex-col gap-3" role="search" aria-label="Search and filter batches">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchField value={query} onChange={onSearch} placeholder="Search batches..." label="Search batches by name" maxLength={60} />
        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">
          <FilterSelect
            label="Filter by mentor"
            value={params.mentor}
            onChange={(v) => update({ mentor: v })}
            options={[{ value: "all", label: "All mentors" }, { value: "none", label: "No mentor" }, ...mentors.map((m) => ({ value: m.id, label: m.name }))]}
          />
          <FilterSelect label="Filter by status" value={params.status} onChange={(v) => update({ status: v as BatchListParams["status"] })} options={STATUS_OPTIONS} />
          <FilterSelect
            label="Sort batches"
            value={params.sort}
            onChange={(v) => update({ sort: v as BatchListParams["sort"] })}
            options={SORT_OPTIONS}
            className="col-span-2 sm:col-span-1"
          />
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
