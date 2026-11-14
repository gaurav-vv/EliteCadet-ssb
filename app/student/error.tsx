"use client";

import { RouteError } from "@/components/layout/route-error";

export default function StudentError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError error={error} reset={reset} homeHref="/student" />;
}
