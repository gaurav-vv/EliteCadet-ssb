"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assignStudentBatchAction, setStudentStatusAction } from "@/lib/actions/academy";
import type { StudentStatus } from "@/types/academy";

interface StudentActionsProps {
  studentId: string;
  status: StudentStatus;
  batchId: string | null;
  batches: { id: string; name: string }[];
}

export function StudentActions({ studentId, status, batchId, batches }: StudentActionsProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function toggleStatus() {
    setPending(true);
    await setStudentStatusAction(studentId, status === "active" ? "inactive" : "active");
    setPending(false);
    router.refresh();
  }

  async function changeBatch(value: string) {
    setPending(true);
    await assignStudentBatchAction(studentId, value === "none" ? null : value);
    setPending(false);
    router.refresh();
  }

  return (
    <div className="glass-surface flex flex-col gap-4 px-6 py-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="batch">Batch</Label>
        <Select value={batchId ?? "none"} onValueChange={changeBatch}>
          <SelectTrigger id="batch" className="w-48">
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
      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={toggleStatus}>
        {status === "active" ? "Mark inactive" : "Mark active"}
      </Button>
    </div>
  );
}
