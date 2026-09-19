"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createSessionAction, cancelSessionAction } from "@/lib/actions/mentor";
import type { MentorSession, SessionInput } from "@/types/mentor";

interface SessionsViewProps {
  sessions: MentorSession[];
  mentees: { id: string; fullName: string }[];
}

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function SessionsView({ sessions, mentees }: SessionsViewProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [menteeId, setMenteeId] = useState(mentees[0]?.id ?? "");
  const [scheduledFor, setScheduledFor] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setErrorMessage(null);

    const input: SessionInput = { title, menteeId, scheduledFor };
    const result = await createSessionAction(input);

    if (!result.ok) {
      setStatus("error");
      setErrorMessage(result.error?.message ?? "Something went wrong. Please try again.");
      return;
    }

    setTitle("");
    setScheduledFor("");
    setStatus("idle");
    router.refresh();
  }

  async function handleCancel(id: string) {
    setCancellingId(id);
    await cancelSessionAction(id);
    setCancellingId(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="glass-surface flex flex-col gap-4 px-6 py-6">
        <h2 className="text-sm font-medium text-text-muted">Create a session</h2>
        {status === "error" && errorMessage && (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} disabled={status === "loading"} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="menteeId">Mentee</Label>
            <Select value={menteeId} onValueChange={setMenteeId}>
              <SelectTrigger id="menteeId" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {mentees.map((mentee) => (
                  <SelectItem key={mentee.id} value={mentee.id}>
                    {mentee.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="scheduledFor">Date and time</Label>
            <Input
              id="scheduledFor"
              type="datetime-local"
              required
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              disabled={status === "loading"}
            />
          </div>
          <Button type="submit" className="sm:col-span-2 sm:w-fit" disabled={status === "loading"}>
            {status === "loading" ? "Creating…" : "Create session"}
          </Button>
        </form>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-text-muted">All sessions</h2>
        {sessions.length === 0 ? (
          <EmptyState title="No sessions yet" description="Create one above." />
        ) : (
          <ul className="flex flex-col gap-2">
            {sessions.map((session) => (
              <li key={session.id} className="glass-surface flex items-center justify-between gap-3 px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {session.title} · {session.menteeName}
                  </p>
                  <p className="text-xs text-text-muted">
                    {formatDateTime(session.scheduledFor)} · {STATUS_LABEL[session.status]}
                  </p>
                </div>
                {session.status === "scheduled" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={cancellingId === session.id}
                    onClick={() => handleCancel(session.id)}
                  >
                    {cancellingId === session.id ? "Cancelling…" : "Cancel"}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
