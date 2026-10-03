"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buildStudentListQuery, hasActiveFilters } from "@/lib/academy/student-list";
import type { StudentListParams } from "@/types/academy";

interface StudentToolbarProps {
  params: StudentListParams;
  batches: { id: string; name: string }[];
  mentors: { id: string; name: string }[];
}

const SEARCH_DEBOUNCE_MS = 300;

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "attention", label: "Needs attention" },
  { value: "inactive", label: "Inactive" },
];
const PERFORMANCE_OPTIONS = [
  { value: "all", label: "Any performance" },
  { value: "80plus", label: "80+ (strong)" },
  { value: "60to79", label: "60–79" },
  { value: "below60", label: "Below 60" },
  { value: "unassessed", label: "Not assessed" },
];
const SORT_OPTIONS = [
  { value: "name", label: "Name (A–Z)" },
  { value: "recent", label: "Recently added" },
  { value: "performance", label: "Performance" },
  { value: "activity", label: "Last activity" },
];

// The URL is the single source of truth for filters: every control writes to
// the query string and the server re-renders with the new results. That keeps
// results shareable, Back/Forward working and the server in charge of paging.
export function StudentToolbar({ params, batches, mentors }: StudentToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(params.q);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(params);

  // Keep the box in step with the URL (Back/Forward, "Clear filters") without
  // clobbering what the user is typing: only adopt the URL's value when it
  // actually changed and differs from the text already in the box.
  const [syncedQ, setSyncedQ] = useState(params.q);
  if (params.q !== syncedQ) {
    setSyncedQ(params.q);
    if (query.trim() !== params.q) setQuery(params.q);
  }

  useEffect(() => {
    latest.current = params;
  }, [params]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function update(patch: Partial<StudentListParams>) {
    startTransition(() => {
      router.replace(`${pathname}${buildStudentListQuery({ ...latest.current, ...patch, page: 1 })}`, { scroll: false });
    });
  }

  function onSearch(value: string) {
    setQuery(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => update({ q: value.trim() }), SEARCH_DEBOUNCE_MS);
  }

  function clearAll() {
    if (timer.current) clearTimeout(timer.current);
    setQuery("");
    startTransition(() => router.replace(pathname, { scroll: false }));
  }

  const filtered = hasActiveFilters(params) || query.trim() !== "";
  const triggerClass = "h-11 w-full sm:h-10 sm:w-auto sm:min-w-36";

  return (
    <div className="flex flex-col gap-3" role="search" aria-label="Search and filter students">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-pill border border-hairline bg-white px-4 focus-within:border-brand-accent focus-within:ring-2 focus-within:ring-brand-accent/25 sm:h-10">
          <Search aria-hidden="true" size={16} className="shrink-0 text-ink-secondary" />
          <span className="sr-only">Search students by name</span>
          <Input
            type="search"
            value={query}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search students by name..."
            maxLength={100}
            className="h-auto border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
          />
        </label>

        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">
          <Select value={params.status} onValueChange={(v) => update({ status: v as StudentListParams["status"] })}>
            <SelectTrigger aria-label="Filter by status" className={triggerClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={params.batch} onValueChange={(v) => update({ batch: v })}>
            <SelectTrigger aria-label="Filter by batch" className={triggerClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All batches</SelectItem>
              <SelectItem value="none">No batch</SelectItem>
              {batches.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={params.mentor} onValueChange={(v) => update({ mentor: v })}>
            <SelectTrigger aria-label="Filter by mentor" className={triggerClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All mentors</SelectItem>
              <SelectItem value="none">No mentor</SelectItem>
              {mentors.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={params.performance} onValueChange={(v) => update({ performance: v as StudentListParams["performance"] })}>
            <SelectTrigger aria-label="Filter by performance" className={triggerClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERFORMANCE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={params.sort} onValueChange={(v) => update({ sort: v as StudentListParams["sort"] })}>
            <SelectTrigger aria-label="Sort students" className={`${triggerClass} col-span-2 sm:col-span-1`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>Sort: {o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
