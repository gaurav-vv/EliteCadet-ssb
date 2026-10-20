"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp } from "lucide-react";
import { PracticeItemForm } from "@/components/admin/practice/item-form";
import { StatusBadge } from "@/components/academy/shared/status-badge";
import { Button } from "@/components/ui/button";
import { moveItemAction, setItemActiveAction } from "@/lib/actions/practice";
import type { AdminPracticeItem, PracticeItemKind } from "@/types/practice";

// The bank's questions in order. Hidden questions stay listed (and keep any
// saved answers); students never see them.
export function PracticeItemList({ slug, kind, items }: { slug: string; kind: PracticeItemKind; items: AdminPracticeItem[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: { message: string } }>) =>
    start(async () => {
      const result = await fn();
      if (result.ok) {
        setError(null);
        router.refresh();
      } else setError(result.error?.message ?? "We couldn't update that question. Please try again.");
    });

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      )}
      <ol className="glass-regular flex flex-col divide-y divide-hairline overflow-hidden rounded-card">
        {items.map((item, i) => (
          <li key={item.id} className="flex flex-col gap-3 px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[12px] text-ink-secondary">
                  {i + 1}. <span className="font-mono">{item.key}</span>
                </p>
                <p className="text-sm whitespace-pre-wrap text-ink">{item.prompt}</p>
                {item.options && (
                  <ul className="mt-1 flex flex-col text-[13px] text-ink-secondary">
                    {item.options.map((o) => (
                      <li key={o.id}>
                        {o.id === item.correctOptionId ? <span className="text-ink">✓ {o.label} (correct)</span> : o.label}
                      </li>
                    ))}
                  </ul>
                )}
                {item.guidance && <p className="mt-1 text-[13px] text-ink-secondary">Checks: {item.guidance.assesses}</p>}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {!item.active && <StatusBadge label="Hidden" tone="neutral" />}
                <Button type="button" variant="outline" size="icon" aria-label={`Move question ${i + 1} up`} disabled={pending || i === 0} onClick={() => run(() => moveItemAction(slug, item.id, "up"))} className="size-11">
                  <ArrowUp aria-hidden="true" size={16} />
                </Button>
                <Button type="button" variant="outline" size="icon" aria-label={`Move question ${i + 1} down`} disabled={pending || i === items.length - 1} onClick={() => run(() => moveItemAction(slug, item.id, "down"))} className="size-11">
                  <ArrowDown aria-hidden="true" size={16} />
                </Button>
                <Button type="button" variant="outline" disabled={pending} onClick={() => setEditing(editing === item.id ? null : item.id)} className="min-h-11" aria-expanded={editing === item.id}>
                  Edit
                </Button>
                <Button type="button" variant="outline" disabled={pending} onClick={() => run(() => setItemActiveAction(slug, item.id, !item.active))} className="min-h-11">
                  {item.active ? "Hide" : "Show"}
                </Button>
              </div>
            </div>
            {editing === item.id && (
              <div className="rounded-control border border-hairline p-4">
                <PracticeItemForm slug={slug} kind={kind} item={item} onDone={() => setEditing(null)} />
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
