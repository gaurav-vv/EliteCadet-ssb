import { Skeleton } from "@/components/ui/skeleton";

// Shared loading shell for the Student and Mentor workspaces (Academy and Admin
// have their own). It renders inside the workspace layout, so the sidebar and
// header stay put while a page's data resolves. It makes waiting visible; it
// does not make the data arrive sooner.
export function WorkspacePageLoading({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-6">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-10 w-72 rounded-control" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-card" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-card lg:col-span-2" />
        <Skeleton className="h-72 rounded-card" />
      </div>
    </div>
  );
}
