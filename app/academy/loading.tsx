import { Skeleton } from "@/components/ui/skeleton";

// Shared loading shell for Academy routes: keeps the page frame stable while
// server data resolves instead of showing a blank screen.
export default function AcademyLoading() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-6">
      <span className="sr-only">Loading your academy…</span>
      <Skeleton className="h-10 w-72 rounded-control" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-card" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-card lg:col-span-2" />
        <Skeleton className="h-80 rounded-card" />
      </div>
    </div>
  );
}
