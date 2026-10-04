import { Skeleton } from "@/components/ui/skeleton";

// Shown while the Students page's database reads resolve.
export default function StudentsLoading() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-6">
      <span className="sr-only">Loading students…</span>
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-40 rounded-control" />
          <Skeleton className="h-4 w-72 rounded-control" />
        </div>
        <Skeleton className="h-11 w-36 rounded-button" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-card" />
        ))}
      </div>
      <Skeleton className="h-10 rounded-pill" />
      <div className="flex flex-col gap-3 rounded-card border border-hairline bg-white p-4">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-12 rounded-control" />
        ))}
      </div>
    </div>
  );
}
