"use client";

import { X } from "lucide-react";
import { FilterSelect } from "@/components/academy/shared/filter-select";
import { SearchField } from "@/components/academy/shared/search-field";
import { Button } from "@/components/ui/button";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { buildUserListQuery, hasActiveUserFilters } from "@/lib/server/users/validation";
import type { UserListParams } from "@/types/users";

const ROLE_OPTIONS = [
  { value: "all", label: "All roles" },
  { value: "student", label: "Students" },
  { value: "mentor", label: "Mentors" },
  { value: "academy_admin", label: "Academy admins" },
  { value: "super_admin", label: "Super admins" },
];
const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];
const SORT_OPTIONS = [
  { value: "newest", label: "Sort: Newest first" },
  { value: "oldest", label: "Sort: Oldest first" },
  { value: "name", label: "Sort: Name (A–Z)" },
  { value: "last_login", label: "Sort: Last login" },
];

export function UserToolbar({ params }: { params: UserListParams }) {
  const { query, onSearch, update, clearAll, isPending } = useUrlFilters({ params, buildQuery: buildUserListQuery });
  const filtered = hasActiveUserFilters(params) || query.trim() !== "";

  return (
    <div className="flex flex-col gap-3" role="search" aria-label="Search and filter users">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchField value={query} onChange={onSearch} placeholder="Search name or email..." label="Search users by name or email" maxLength={80} />
        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">
          <FilterSelect label="Filter by role" value={params.role} onChange={(v) => update({ role: v as UserListParams["role"] })} options={ROLE_OPTIONS} />
          <FilterSelect label="Filter by status" value={params.status} onChange={(v) => update({ status: v as UserListParams["status"] })} options={STATUS_OPTIONS} />
          <FilterSelect
            label="Sort users"
            value={params.sort}
            onChange={(v) => update({ sort: v as UserListParams["sort"] })}
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
