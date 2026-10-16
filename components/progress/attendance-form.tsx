"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { markAttendanceAction } from "@/lib/actions/progress";
import type { AttendanceStatus } from "@/types/progress";

const OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "excused", label: "Excused" },
];

interface Row {
  studentId: string;
  name: string;
  status: AttendanceStatus | null;
}

export function AttendanceForm({ sessionId, rows }: { sessionId: string; rows: Row[] }) {
  const [marks, setMarks] = useState<Record<string, AttendanceStatus | "">>(() => Object.fromEntries(rows.map((r) => [r.studentId, r.status ?? ""])));
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      const entries = Object.entries(marks).filter(([, s]) => s).map(([studentId, status]) => ({ studentId, status }));
      const result = await markAttendanceAction(sessionId, entries);
      setMessage(result.ok ? { ok: true, text: "Attendance saved." } : { ok: false, text: result.error?.message ?? "We couldn't save attendance. Please try again." });
    });

  return (
    <div className="glass-regular flex flex-col gap-4 rounded-card p-6">
      <ul className="flex flex-col divide-y divide-hairline">
        {rows.map((r) => (
          <li key={r.studentId} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-ink">{r.name}</span>
            <fieldset className="flex gap-2">
              <legend className="sr-only">Attendance for {r.name}</legend>
              {OPTIONS.map((o) => (
                <label key={o.value} className="filter-chip inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-3 text-[13px] text-ink">
                  <input type="radio" name={`att-${r.studentId}`} value={o.value} checked={marks[r.studentId] === o.value} onChange={() => setMarks((m) => ({ ...m, [r.studentId]: o.value }))} />
                  {o.label}
                </label>
              ))}
            </fieldset>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={save} disabled={pending}>{pending ? "Saving…" : "Save attendance"}</Button>
        {message && <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-[13px] text-ink" : "text-[13px] text-danger"}>{message.text}</p>}
      </div>
    </div>
  );
}
