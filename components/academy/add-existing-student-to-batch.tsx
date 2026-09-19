"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assignStudentBatchAction } from "@/lib/actions/academy";

interface AddExistingStudentToBatchProps {
  batchId: string;
  unassignedStudents: { id: string; fullName: string }[];
}

export function AddExistingStudentToBatch({ batchId, unassignedStudents }: AddExistingStudentToBatchProps) {
  const router = useRouter();
  const [studentId, setStudentId] = useState(unassignedStudents[0]?.id ?? "");
  const [pending, setPending] = useState(false);

  if (unassignedStudents.length === 0) return null;

  async function handleAdd() {
    if (!studentId) return;
    setPending(true);
    await assignStudentBatchAction(studentId, batchId);
    setPending(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Select value={studentId} onValueChange={setStudentId}>
        <SelectTrigger className="w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {unassignedStudents.map((student) => (
            <SelectItem key={student.id} value={student.id}>
              {student.fullName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="button" size="sm" disabled={pending} onClick={handleAdd}>
        {pending ? "Adding…" : "Add to batch"}
      </Button>
    </div>
  );
}
