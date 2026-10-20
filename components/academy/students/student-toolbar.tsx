"use client";

import { X } from "lucide-react";
import { FilterSelect } from "@/components/academy/shared/filter-select";
import { SearchField } from "@/components/academy/shared/search-field";
import { Button } from "@/components/ui/button";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { buildStudentQuery, hasActiveStudentFilters } from "@/lib/server/academy-people/validation";
import type { AcademyStudentListParams } from "@/types/academy-people";

const STATUS_OPTIONS = [
  { value: "all", label: "All accounts" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];
const SORT_OPTIONS = [
  { value: "name", label: "Sort: Name (A–Z)" },
  { value: "newest", label: "Sort: Newest first" },
  { value: "oldest", label: "Sort: Oldest first" },
  { value: "last_login", label: "Sort: Last login" },
];

// Only filters backed by real columns: name/email, batch, account status.
// (Performance filters return with real progress data — Phase 8.)
export function StudentToolbar({ params, batches, searchLabel = "Search students by name or email" }: { params: AcademyStudentListParams; batches: { id: string; name: string }[]; searchLabel?: string }) {
  const { query, onSearch, update, clearAll, isPending } = useUrlFilters({ params, buildQuery: buildStudentQuery });
  const filtered = hasActiveStudentFilters(params) || query.trim() !== "";

  return (
    <div className="flex flex-col gap-3" role="search" aria-label="Search and filter students">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchField value={query} onChange={onSearch} placeholder="Search name or email..." label={searchLabel} maxLength={80} />
        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">
          <FilterSelect
            label="Filter by batch"
            value={params.batch}
            onChange={(v) => update({ batch: v })}
            options={[{ value: "all", label: "All batches" }, { value: "none", label: "No batch" }, ...batches.map((b) => ({ value: b.id, label: b.name }))]}
          />
          <FilterSelect label="Filter by account status" value={params.status} onChange={(v) => update({ status: v as AcademyStudentListParams["status"] })} options={STATUS_OPTIONS} />
          <FilterSelect label="Sort students" value={params.sort} onChange={(v) => update({ sort: v as AcademyStudentListParams["sort"] })} options={SORT_OPTIONS} className="col-span-2 sm:col-span-1" />
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
