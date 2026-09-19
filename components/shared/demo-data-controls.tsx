"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ActionResult {
  ok: boolean;
}

interface DemoDataControlsProps {
  loadAction: () => Promise<ActionResult>;
  clearAction: () => Promise<ActionResult>;
  description?: string;
}

export function DemoDataControls({
  loadAction,
  clearAction,
  description = "This resets the sample data used to preview this section — it doesn't affect your real account.",
}: DemoDataControlsProps) {
  const router = useRouter();
  const [pending, setPending] = useState<"load" | "clear" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleLoad() {
    setPending("load");
    await loadAction();
    setPending(null);
    setMessage("Demo data loaded.");
    router.refresh();
  }

  async function handleClear() {
    setPending("clear");
    await clearAction();
    setPending(null);
    setMessage("Demo data cleared.");
    router.refresh();
  }

  return (
    <div className="glass-regular flex flex-col gap-4 px-6 py-6">
      <div>
        <h2 className="text-sm font-medium text-ink-secondary">Demo data</h2>
        <p className="text-xs text-ink-secondary">{description}</p>
      </div>
      {message && (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="button" size="sm" disabled={pending !== null} onClick={handleLoad}>
          {pending === "load" ? "Loading…" : "Load demo data"}
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={pending !== null} onClick={handleClear}>
          {pending === "clear" ? "Clearing…" : "Clear demo data"}
        </Button>
      </div>
    </div>
  );
}
