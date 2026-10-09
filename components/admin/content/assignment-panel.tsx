"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addContentAssignmentAction } from "@/lib/actions/content";
import { assignMyContentAction } from "@/lib/actions/mentor-content";

interface AssignmentPanelProps {
  contentId: string;
  academies: { id: string; name: string }[];
  batches: { id: string; name: string }[];
  // "mentor": batches only (their own), via the mentor action.
  mode?: "platform" | "mentor";
}

// Assign content to one academy or one batch (only matters when its
// visibility is "assigned"; the reader rule lives in RLS).
export function AssignmentPanel({ contentId, academies, batches, mode = "platform" }: AssignmentPanelProps) {
  const router = useRouter();
  const [kind, setKind] = useState<"academy" | "batch">(mode === "mentor" ? "batch" : "academy");
  const [target, setTarget] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const options = kind === "academy" ? academies : batches;

  async function add() {
    if (!target) return;
    setPending(true);
    setError(null);
    try {
      const assign = mode === "mentor" ? assignMyContentAction : addContentAssignmentAction;
      const result = await assign(contentId, kind === "academy" ? { academyId: target } : { batchId: target });
      if (!result.ok) {
        setError(result.error?.message ?? "That didn't work. Please try again.");
        return;
      }
      setTarget("");
      router.refresh();
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className={mode === "mentor" ? "grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end" : "grid gap-3 sm:grid-cols-[160px_1fr_auto] sm:items-end"}>
        {mode === "platform" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="assign-kind">Assign to</Label>
          <Select value={kind} onValueChange={(v) => { setKind(v as "academy" | "batch"); setTarget(""); }} disabled={pending}>
            <SelectTrigger id="assign-kind" className="min-h-11 w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="academy">An academy</SelectItem>
              <SelectItem value="batch">A batch</SelectItem>
            </SelectContent>
          </Select>
        </div>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="assign-target">{mode === "mentor" ? "Share with one of your batches" : kind === "academy" ? "Academy" : "Batch"}</Label>
          <Select value={target} onValueChange={setTarget} disabled={pending || options.length === 0}>
            <SelectTrigger id="assign-target" className="min-h-11 w-full">
              <SelectValue placeholder={options.length === 0 ? `No ${kind === "academy" ? "academies" : "batches"} yet` : "Choose…"} />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" className="min-h-11" onClick={add} disabled={pending || !target}>
          {pending ? "Saving…" : mode === "mentor" ? "Share" : "Assign"}
        </Button>
      </div>
    </div>
  );
}
