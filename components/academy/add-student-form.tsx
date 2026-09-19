"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addStudentAction } from "@/lib/actions/academy";

interface AddStudentFormProps {
  batches: { id: string; name: string }[];
}

export function AddStudentForm({ batches }: AddStudentFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [batchId, setBatchId] = useState<string>("none");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setErrorMessage(null);

    const result = await addStudentAction({ fullName, batchId: batchId === "none" ? null : batchId });

    if (!result.ok) {
      setStatus("error");
      setErrorMessage(result.error?.message ?? "Something went wrong. Please try again.");
      return;
    }

    setFullName("");
    setBatchId("none");
    setStatus("idle");
    router.refresh();
  }

  return (
    <div className="glass-surface flex flex-col gap-4 px-6 py-6">
      <h2 className="text-sm font-medium text-text-muted">Add a student</h2>
      {status === "error" && errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={status === "loading"} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="batchId">Batch (optional)</Label>
          <Select value={batchId} onValueChange={setBatchId}>
            <SelectTrigger id="batchId" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Unassigned</SelectItem>
              {batches.map((batch) => (
                <SelectItem key={batch.id} value={batch.id}>
                  {batch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Adding…" : "Add student"}
        </Button>
      </form>
    </div>
  );
}
