"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { readCompletedSlugs } from "@/lib/student/resource-completion";

export function ResourceReadBadge({ slug }: { slug: string }) {
  const [isRead] = useState(() => readCompletedSlugs().includes(slug));

  if (!isRead) return null;

  return (
    <span className="inline-flex items-center gap-1 text-xs text-success">
      <CheckCircle2 aria-hidden="true" size={14} />
      Read
    </span>
  );
}
