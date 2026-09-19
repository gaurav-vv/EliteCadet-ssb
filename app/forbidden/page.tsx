import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Forbidden" };

export default function ForbiddenPage() {
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-20 text-center">
      <div className="glass-regular flex flex-col items-center gap-3 px-8 py-10">
        <h1 className="text-xl font-semibold text-ink">You don&apos;t have access to this area</h1>
        <p className="text-sm text-ink-secondary">
          This section belongs to a different role than the one on your account.
        </p>
        <Button asChild size="sm">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
