"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Toast } from "@/components/academy/shared/toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { assignStudentAction, searchAssignableStudentsAction, unassignStudentAction } from "@/lib/actions/mentor-assignments";
import type { AssignedStudent, StudentOption } from "@/types/mentor-assignments";

const TOAST_MS = 5000;

interface MentorStudentsPanelProps {
  mentorId: string;
  mentorName: string;
  assigned: AssignedStudent[];
}

// Super admin: the students an independent mentor looks after. Only students who belong to no academy
// can be assigned; the rules are enforced on the server and by the database, this only shows them.
export function MentorStudentsPanel({ mentorId, mentorName, assigned }: MentorStudentsPanelProps) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<StudentOption[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // A ref, not state: a second click in the same tick must not send a second request.
  const working = useRef(false);

  function notify(message: string, tone: "success" | "error" = "success") {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, tone });
    timer.current = setTimeout(() => setToast(null), TOAST_MS);
  }

  async function search(event?: React.FormEvent) {
    event?.preventDefault();
    setError(null);
    setSearching(true);
    try {
      const result = await searchAssignableStudentsAction(mentorId, q);
      if (!result.ok) {
        setError(result.error?.message ?? "We couldn't search students. Please try again.");
        return;
      }
      setResults(result.data ?? []);
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setSearching(false);
    }
  }

  async function run(studentId: string, task: () => Promise<{ ok: boolean; error?: { message: string } }>, done: string) {
    if (working.current) return;
    working.current = true;
    setBusyId(studentId);
    setError(null);
    try {
      const result = await task();
      if (!result.ok) {
        notify(result.error?.message ?? "That didn't work. Please try again.", "error");
        return;
      }
      notify(done);
      setResults((rows) => (rows ? rows.filter((r) => r.id !== studentId) : rows));
      router.refresh();
    } catch {
      notify("We couldn't reach the server. Check your connection and try again.", "error");
    } finally {
      working.current = false;
      setBusyId(null);
    }
  }

  return (
    <section aria-labelledby="mentor-students-heading" className="glass-regular flex flex-col gap-5 rounded-card px-6 py-5">
      <div className="flex flex-col gap-1">
        <h2 id="mentor-students-heading" className="text-[18px] font-bold text-ink">
          Assigned students
        </h2>
        <p className="text-sm text-ink-secondary">
          {mentorName} is an independent mentor. They can only see the students listed here, and only students who don&apos;t belong to an academy can be added.
        </p>
      </div>

      {assigned.length === 0 ? (
        <p className="text-sm text-ink-secondary">No students assigned yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-hairline">
          {assigned.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
              <span className="min-w-0 text-sm text-ink">
                <span className="block truncate font-medium">{s.fullName || s.email || "Student"}</span>
                {s.email && s.fullName && <span className="block truncate text-[12px] text-ink-secondary">{s.email}</span>}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 shrink-0"
                disabled={busyId !== null}
                onClick={() => run(s.id, () => unassignStudentAction(mentorId, s.id), "Student removed.")}
                aria-label={`Remove ${s.fullName || s.email || "student"}`}
              >
                {busyId === s.id ? "Removing…" : "Remove"}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={search} className="flex flex-col gap-2 border-t border-hairline pt-4" noValidate>
        <Label htmlFor="assign-search">Find a student to assign</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input id="assign-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or email" className="min-h-11" disabled={searching} />
          <Button type="submit" className="min-h-11" disabled={searching} aria-busy={searching}>
            {searching ? "Searching…" : "Search"}
          </Button>
        </div>
      </form>

      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {results && (
        <div className="flex flex-col gap-2" aria-live="polite">
          {results.length === 0 ? (
            <p className="text-sm text-ink-secondary">No matching students without an academy.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-hairline">
              {results.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0 text-sm text-ink">
                    <span className="block truncate font-medium">{s.fullName || s.email || "Student"}</span>
                    {s.email && s.fullName && <span className="block truncate text-[12px] text-ink-secondary">{s.email}</span>}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    className="min-h-11 shrink-0"
                    disabled={busyId !== null}
                    onClick={() => run(s.id, () => assignStudentAction(mentorId, s.id), "Student assigned.")}
                    aria-label={`Assign ${s.fullName || s.email || "student"}`}
                  >
                    {busyId === s.id ? "Assigning…" : "Assign"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {toast && <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
    </section>
  );
}
