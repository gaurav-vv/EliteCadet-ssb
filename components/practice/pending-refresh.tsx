"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// While feedback is being prepared, re-check every few seconds for a few
// minutes, then stop (the notification covers anything slower).
export function PendingRefresh({ active, intervalMs = 8000, maxMs = 180_000 }: { active: boolean; intervalMs?: number; maxMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const started = Date.now();
    const id = setInterval(() => {
      if (Date.now() - started > maxMs) clearInterval(id);
      else router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs, maxMs, router]);
  return null;
}
