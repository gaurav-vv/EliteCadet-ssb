"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { revokeAdminAccessAction } from "@/lib/actions/admin-access";
import type { AdminArea } from "@/types/admin";

interface RevokeAccessButtonProps {
  userId: string;
  area: AdminArea;
  areaLabel: string;
  email: string;
}

// Announces the outcome in the page's live region and returns focus to the
// list heading, because this row (and its trigger) disappears on refresh.
function announce(message: string) {
  const region = document.getElementById("access-announcer");
  if (region) region.textContent = message;
  document.getElementById("grants-heading")?.focus();
}

export function RevokeAccessButton({ userId, area, areaLabel, email }: RevokeAccessButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      const result = await revokeAdminAccessAction(userId, area);
      if (!result.ok) {
        setError(result.error?.message ?? "Something went wrong. Please try again.");
        return;
      }
      setOpen(false);
      announce(`${areaLabel} access removed for ${email}.`);
      router.refresh();
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (loading) return;
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`Remove ${areaLabel} access for ${email}`}
          className="row-action flex size-11 items-center justify-center rounded-pill text-ink-secondary"
        >
          <X aria-hidden="true" size={18} />
        </button>
      </DialogTrigger>
      <DialogContent className="glass-thick rounded-panel sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Remove access?</DialogTitle>
          <DialogDescription>
            {email} will lose {areaLabel} access on their next page load.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="flex items-center gap-2 text-[13px] text-ink">
            <AlertCircle aria-hidden="true" size={16} className="shrink-0 text-danger" />
            {error}
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="ghost" className="min-h-11" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" className="min-h-11" onClick={handleConfirm} disabled={loading}>
            {loading ? "Removing…" : "Remove access"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
