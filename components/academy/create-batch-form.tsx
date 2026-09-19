"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createBatchAction } from "@/lib/actions/academy";

export function CreateBatchForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setErrorMessage(null);

    const result = await createBatchAction({ name });

    if (!result.ok) {
      setStatus("error");
      setErrorMessage(result.error?.message ?? "Something went wrong. Please try again.");
      return;
    }

    setName("");
    setStatus("idle");
    router.refresh();
  }

  return (
    <div className="glass-regular flex flex-col gap-4 px-6 py-6">
      <h2 className="text-sm font-medium text-ink-secondary">Create a batch</h2>
      {status === "error" && errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="batchName">Batch name</Label>
          <Input id="batchName" required value={name} onChange={(e) => setName(e.target.value)} disabled={status === "loading"} />
        </div>
        <Button type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Creating…" : "Create batch"}
        </Button>
      </form>
    </div>
  );
}
