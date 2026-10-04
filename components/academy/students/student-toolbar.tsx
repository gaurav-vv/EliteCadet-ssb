"use client";

import { X } from "lucide-react";
import { FilterSelect } from "@/components/academy/shared/filter-select";
import { SearchField } from "@/components/academy/shared/search-field";
import { Button } from "@/components/ui/button";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { buildStudentListQuery, hasActiveStudentFilters } from "@/lib/academy/student-list";
import type { StudentBatchOption, StudentListParams } from "@/types/academy";

interface StudentToolbarProps {
  params: StudentListParams;
  batches: StudentBatchOption[];
}

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];
const SORT_OPTIONS = [
  { value: "name", label: "Sort: Name (A–Z)" },
  { value: "newest", label: "Sort: Newest first" },
  { value: "oldest", label: "Sort: Oldest first" },
];

// The URL is the single source of truth for filters: every control writes to the
// query string and the server re-renders with the new results. Only filters and
// sorts backed by real columns are offered (name, status, batch, created date).
export function StudentToolbar({ params, batches }: StudentToolbarProps) {
  const { query, onSearch, update, clearAll, isPending } = useUrlFilters({ params, buildQuery: buildStudentListQuery });
  const filtered = hasActiveStudentFilters(params) || query.trim() !== "";

  return (
    <div className="flex flex-col gap-3" role="search" aria-label="Search and filter students">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchField value={query} onChange={onSearch} placeholder="Search students by name..." label="Search students by name" maxLength={80} />
        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">
          <FilterSelect label="Filter by status" value={params.status} onChange={(v) => update({ status: v as StudentListParams["status"] })} options={STATUS_OPTIONS} />
          <FilterSelect
            label="Filter by batch"
            value={params.batch}
            onChange={(v) => update({ batch: v })}
            options={[
              { value: "all", label: "All batches" },
              { value: "none", label: "No batch" },
              ...batches.map((b) => ({ value: b.id, label: b.status === "archived" ? `${b.name} (archived)` : b.name })),
            ]}
          />
          <FilterSelect
            label="Sort students"
            value={params.sort}
            onChange={(v) => update({ sort: v as StudentListParams["sort"] })}
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
