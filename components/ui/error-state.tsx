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
    <div className="flex flex-col items-center gap-3 rounded-lg border border-danger/30 bg-danger-bg px-6 py-10 text-center">
      <AlertCircle aria-hidden="true" size={28} className="text-danger" />
      <p className="text-sm text-text-primary">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
