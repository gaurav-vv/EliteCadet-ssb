import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = "Loading…" }: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center gap-3 px-6 py-12 text-center text-ink-secondary"
    >
      <Loader2 aria-hidden="true" size={24} className="animate-spin text-brand-accent" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
