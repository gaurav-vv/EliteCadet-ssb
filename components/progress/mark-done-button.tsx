"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setContentDoneAction } from "@/lib/actions/progress";

export function MarkDoneButton({ contentId, initialDone }: { contentId: string; initialDone: boolean }) {
  const [done, setDone] = useState(initialDone);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const toggle = () =>
    start(async () => {
      const result = await setContentDoneAction(contentId, !done);
      if (result.ok) {
        setDone(!done);
        setError(null);
      } else setError(result.error?.message ?? "We couldn't save that. Please try again.");
    });

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" variant={done ? "outline" : "default"} onClick={toggle} disabled={pending} aria-pressed={done}>
        {done && <Check aria-hidden="true" size={16} />}
        {done ? "Done — counted in your progress" : "Mark as done"}
      </Button>
      {error && <p role="alert" className="text-[13px] text-danger">{error}</p>}
    </div>
  );
}
