"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { copyTemplateAction } from "@/lib/actions/mentor-content";

// "Use this template": copies it into My Content as a draft, then opens it.
export function CopyTemplateButton({ templateId, title }: { templateId: string; title: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function copy() {
    setPending(true);
    setError(null);
    try {
      const result = await copyTemplateAction(templateId);
      if (!result.ok || !result.data) {
        setError(result.error?.message ?? "That didn't work. Please try again.");
        return;
      }
      router.push(`/mentor/content/${result.data.id}`);
    } catch {
      setError("We couldn't reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="outline" className="min-h-11" onClick={copy} disabled={pending} aria-label={`Use the template ${title}`}>
        {pending ? "Copying…" : "Use this template"}
      </Button>
      {error && <p role="alert" className="text-[12px] text-(--academy-danger-text)">{error}</p>}
    </div>
  );
}
