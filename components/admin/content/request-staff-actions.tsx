"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deliverRequestAction, quoteRequestAction } from "@/lib/actions/content";
import type { ContentRequestStatus } from "@/types/content";

interface RequestStaffActionsProps {
  requestId: string;
  status: ContentRequestStatus;
  currentFee: number | null;
  contentOptions: { id: string; name: string }[];
}

// Quote (or re-quote) a new request, and deliver an accepted one by copying a
// platform content item into the mentor's My Content.
export function RequestStaffActions({ requestId, status, currentFee, contentOptions }: RequestStaffActionsProps) {
  const router = useRouter();
  const [fee, setFee] = useState(currentFee !== null ? String(currentFee) : "");
  const [note, setNote] = useState("");
  const [contentId, setContentId] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function run(fn: () => Promise<{ ok: boolean; error?: { message: string } }>, success: string) {
    setPending(true);
    setMessage(null);
    try {
      const result = await fn();
      if (!result.ok) {
        setMessage({ tone: "error", text: result.error?.message ?? "That didn't work. Please try again." });
        return;
      }
      setMessage({ tone: "success", text: success });
      router.refresh();
    } catch {
      setMessage({ tone: "error", text: "We couldn't reach the server. Please try again." });
    } finally {
      setPending(false);
    }
  }

  const canQuote = status === "requested" || status === "quoted";
  const canDeliver = status === "accepted" || status === "in_progress";
  if (!canQuote && !canDeliver) return null;

  return (
    <div className="flex flex-col gap-3">
      {message && (
        <Alert variant={message.tone === "error" ? "destructive" : "default"} role={message.tone === "error" ? "alert" : "status"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}
      {canQuote && (
        <div className="grid gap-3 sm:grid-cols-[160px_1fr_auto] sm:items-end">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`fee-${requestId}`}>Fee (₹)</Label>
            <Input id={`fee-${requestId}`} inputMode="decimal" className="min-h-11" value={fee} onChange={(e) => setFee(e.target.value)} disabled={pending} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`note-${requestId}`}>Note to the mentor (optional)</Label>
            <Input id={`note-${requestId}`} className="min-h-11" value={note} onChange={(e) => setNote(e.target.value)} disabled={pending} maxLength={500} />
          </div>
          <Button type="button" className="min-h-11" disabled={pending || !fee.trim()} onClick={() => run(() => quoteRequestAction(requestId, fee, note), "Quote sent to the mentor.")}>
            {status === "quoted" ? "Update quote" : "Send quote"}
          </Button>
        </div>
      )}
      {canDeliver && (
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`deliver-${requestId}`}>Deliver this content (copied into the mentor&apos;s My Content as a draft)</Label>
            <Select value={contentId} onValueChange={setContentId} disabled={pending || contentOptions.length === 0}>
              <SelectTrigger id={`deliver-${requestId}`} className="min-h-11 w-full">
                <SelectValue placeholder={contentOptions.length === 0 ? "Create the content in the Content Library first" : "Choose content…"} />
              </SelectTrigger>
              <SelectContent>
                {contentOptions.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" className="min-h-11" disabled={pending || !contentId} onClick={() => run(() => deliverRequestAction(requestId, contentId), "Delivered to the mentor.")}>
            Deliver
          </Button>
        </div>
      )}
    </div>
  );
}
