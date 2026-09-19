"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

const LOCAL_KEYS = ["ssb-onboarding-draft", "ssb-onboarding-complete", "ssb-student-profile", "ssb-resources-read"];

export function ResetLocalData() {
  const [message, setMessage] = useState<string | null>(null);

  function handleReset() {
    try {
      LOCAL_KEYS.forEach((key) => window.localStorage.removeItem(key));
    } catch {
      // Private browsing / blocked storage — nothing to clear either way.
    }
    setMessage("Local demo data cleared. Refresh the dashboard to see a fresh, new-student state.");
  }

  return (
    <div className="glass-regular flex flex-col gap-4 px-6 py-6">
      <div>
        <h2 className="text-sm font-medium text-ink-secondary">Demo data</h2>
        <p className="text-xs text-ink-secondary">
          Your onboarding answers and profile are stored in this browser only (status.md, 2026-09-18).
          Clearing them resets you to a brand-new student.
        </p>
      </div>
      {message && (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      <Button type="button" size="sm" variant="outline" className="self-start" onClick={handleReset}>
        Clear local demo data
      </Button>
    </div>
  );
}
