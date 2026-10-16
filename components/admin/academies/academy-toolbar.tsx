"use client";

import { X } from "lucide-react";
import { FilterSelect } from "@/components/academy/shared/filter-select";
import { SearchField } from "@/components/academy/shared/search-field";
import { Button } from "@/components/ui/button";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { buildAcademyListQuery, hasActiveAcademyFilters } from "@/lib/server/academies/validation";
import type { AcademyListParams } from "@/types/academies";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];
const SORT_OPTIONS = [
  { value: "newest", label: "Sort: Newest first" },
  { value: "oldest", label: "Sort: Oldest first" },
  { value: "name", label: "Sort: Name (A–Z)" },
];

export function AcademyToolbar({ params }: { params: AcademyListParams }) {
  const { query, onSearch, update, clearAll, isPending } = useUrlFilters({ params, buildQuery: buildAcademyListQuery });
  const filtered = hasActiveAcademyFilters(params) || query.trim() !== "";

  return (
    <div className="flex flex-col gap-3" role="search" aria-label="Search and filter academies">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchField value={query} onChange={onSearch} placeholder="Search name or contact email..." label="Search academies" maxLength={80} />
        <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
          <FilterSelect label="Filter by status" value={params.status} onChange={(v) => update({ status: v as AcademyListParams["status"] })} options={STATUS_OPTIONS} />
          <FilterSelect label="Sort academies" value={params.sort} onChange={(v) => update({ sort: v as AcademyListParams["sort"] })} options={SORT_OPTIONS} />
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
