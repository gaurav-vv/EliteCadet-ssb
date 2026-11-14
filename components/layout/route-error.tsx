"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

// Shared body for every app/**/error.tsx boundary (AGENTS.md §12): plain
// language plus a recovery action, never a stack trace. Rendered inside the
// nearest layout, so a workspace keeps its sidebar while one page fails.
export function RouteError({ error, reset, homeHref = "/" }: { error: Error & { digest?: string }; reset: () => void; homeHref?: string }) {
  useEffect(() => {
    // The digest links this to the server log line without exposing details.
    console.error("[route] page failed to render", { digest: error.digest });
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <div role="alert" className="glass-regular flex flex-col items-center gap-3 rounded-card px-8 py-10">
        <AlertCircle aria-hidden="true" size={24} className="text-ink-secondary" />
        <h1 className="text-xl font-semibold text-ink">Something went wrong on this page</h1>
        <p className="text-sm text-ink-secondary">
          It&apos;s not something you did. Try again, and if it keeps happening, come back in a few minutes.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Button type="button" className="min-h-11" onClick={reset}>
            Try again
          </Button>
          <Button asChild variant="outline" className="min-h-11">
            <Link href={homeHref}>Go to dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
