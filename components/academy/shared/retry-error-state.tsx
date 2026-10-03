"use client";

import { useRouter } from "next/navigation";
import { ErrorState } from "@/components/ui/error-state";

// ErrorState with a working "Try again": re-runs the server component's data
// fetch via router.refresh() (a Server Component can't pass a click handler).
export function RetryErrorState({ message }: { message: string }) {
  const router = useRouter();
  return <ErrorState message={message} onRetry={() => router.refresh()} />;
}
