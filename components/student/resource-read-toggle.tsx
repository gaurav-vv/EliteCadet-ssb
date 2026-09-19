"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { readCompletedSlugs, setResourceRead } from "@/lib/student/resource-completion";

export function ResourceReadToggle({ slug }: { slug: string }) {
  const [isRead, setIsRead] = useState(() => readCompletedSlugs().includes(slug));

  function toggle() {
    setResourceRead(slug, !isRead);
    setIsRead(!isRead);
  }

  return (
    <Button type="button" variant={isRead ? "secondary" : "default"} size="sm" onClick={toggle}>
      {isRead ? (
        <>
          <CheckCircle2 aria-hidden="true" size={16} /> Marked as read
        </>
      ) : (
        "Mark as read"
      )}
    </Button>
  );
}
