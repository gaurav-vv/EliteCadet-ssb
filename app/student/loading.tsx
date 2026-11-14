import { Skeleton } from "@/components/ui/skeleton";

// Shared loading shell for every Student route without its own loading.tsx:
// shows the page frame at once on navigation instead of freezing on the
// previous page while server data resolves (AGENTS.md §12).
export default function StudentLoading() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-6">
      <span className="sr-only">Loading…</span>
      <Skeleton className="h-10 w-72 max-w-full rounded-control" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-card" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-card" />
    </div>
  );
}
