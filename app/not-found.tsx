import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-20 text-center">
      <div className="glass-regular flex flex-col items-center gap-3 px-8 py-10">
        <h1 className="text-xl font-semibold text-ink">We couldn&apos;t find that page</h1>
        <p className="text-sm text-ink-secondary">The link may be old or mistyped. Head back and pick up where you left off.</p>
        <Button asChild size="sm" className="min-h-11">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
