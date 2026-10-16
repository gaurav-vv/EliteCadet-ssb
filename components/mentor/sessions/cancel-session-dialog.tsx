"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cancelSessionAction } from "@/lib/actions/sessions";

// Cancelling needs a reason; participants see it on their Sessions page.
export function CancelSessionDialog({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setPending(true);
    setError(null);
    try {
      const result = await cancelSessionAction(sessionId, reason);
      if (!result.ok) {
        setError(result.error?.message ?? "That didn't work. Please try again.");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("We couldn't reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <DialogTrigger asChild>
        <Button type="button" variant="destructive" className="min-h-11">Cancel session</Button>
      </DialogTrigger>
      <DialogContent className="rounded-panel sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Cancel this session?</DialogTitle>
          <DialogDescription>Your students will see it as cancelled, with your reason.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cancel-reason">Reason</Label>
          <Textarea id="cancel-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} disabled={pending} maxLength={300} />
        </div>
        {error && <Alert variant="destructive" role="alert"><AlertDescription>{error}</AlertDescription></Alert>}
        <DialogFooter>
          <Button type="button" variant="ghost" className="min-h-11" onClick={() => setOpen(false)} disabled={pending}>Keep it</Button>
          <Button type="button" variant="destructive" className="min-h-11" onClick={confirm} disabled={pending || reason.trim().length < 3}>{pending ? "Cancelling…" : "Cancel session"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
