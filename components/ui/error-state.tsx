import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

// Default message matches specs.md §4.3's global API-failure copy — pass a
// more specific one (e.g. the AI-failure copy) where the context calls for it.
export function ErrorState({
  message = "We couldn't load this. Please try again.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="glass-regular flex flex-col items-center gap-3 rounded-card border-danger/30 px-6 py-10 text-center">
      <AlertCircle aria-hidden="true" size={24} className="text-danger" />
      <p className="text-[14px] text-ink">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
