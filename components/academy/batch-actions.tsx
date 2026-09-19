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
import { assignBatchMentorAction, removeStudentFromBatchAction } from "@/lib/actions/academy";

interface BatchMentorAssignProps {
  batchId: string;
  mentorId: string | null;
  mentors: { id: string; fullName: string; status: string }[];
}

export function BatchMentorAssign({ batchId, mentorId, mentors }: BatchMentorAssignProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function changeMentor(value: string) {
    setPending(true);
    await assignBatchMentorAction(batchId, value === "none" ? null : value);
    setPending(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="mentor">Mentor</Label>
      <Select value={mentorId ?? "none"} onValueChange={changeMentor} disabled={pending}>
        <SelectTrigger id="mentor" className="w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Unassigned</SelectItem>
          {mentors.map((mentor) => (
            <SelectItem key={mentor.id} value={mentor.id} disabled={mentor.status === "invited"}>
              {mentor.fullName}
              {mentor.status === "invited" ? " (invite pending)" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function RemoveStudentButton({ batchId, studentId }: { batchId: string; studentId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleRemove() {
    setPending(true);
    await removeStudentFromBatchAction(batchId, studentId);
    setPending(false);
    router.refresh();
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={pending} onClick={handleRemove}>
      {pending ? "Removing…" : "Remove"}
    </Button>
  );
}
