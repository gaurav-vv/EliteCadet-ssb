"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

const LOCAL_KEYS = [
  "ssb-onboarding-draft",
  "ssb-onboarding-complete",
  "ssb-student-profile",
  "ssb-resources-read",
  "ssb-interview-piq",
  "ssb-piq-answers",
  "ssb-journey-self-assessment",
];

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
          Your onboarding draft, profile, PIQ form and self-assessment are stored in this browser only. Clearing
          them doesn&apos;t touch your saved practice, which is kept in your account.
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
