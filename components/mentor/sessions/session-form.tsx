"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { scheduleAcademyMeetingAction, scheduleSessionAction, updateSessionAction } from "@/lib/actions/sessions";
import { MEETING_BATCH_MAX_STUDENTS, MEETING_DAILY_LIMIT_MINUTES, MEETING_MAX_MINUTES, MEETING_MIN_MINUTES, type SessionInput } from "@/types/sessions";

type Errors = Partial<Record<keyof SessionInput, string>>;

interface SessionFormProps {
  batches: { id: string; name: string; students: { id: string; name: string }[]; mentors?: { id: string; name: string }[] }[];
  // "academy": an academy admin schedules a live meeting for a host mentor
  // (live video room only, no edit mode).
  variant?: "mentor" | "academy";
  // Edit mode: the session id + its current values (date/times already in IST).
  sessionId?: string;
  initial?: SessionInput;
}

const BLANK: SessionInput = { batchId: "", title: "", description: "", date: "", startTime: "", endTime: "", mode: "room", meetingUrl: "", location: "", forWholeBatch: true, participantIds: [], studentId: "" };

const MODES = [
  { value: "room", label: "Live video room" },
  { value: "online", label: "Online (meeting link)" },
  { value: "offline", label: "Offline (in person)" },
] as const;

// Schedule (or edit) a session for one of the mentor's batches. Times are
// entered in IST; the server converts and re-validates everything.
export function SessionForm({ batches, sessionId, initial, variant = "mentor" }: SessionFormProps) {
  const academy = variant === "academy";
  const router = useRouter();
  const [values, setValues] = useState<SessionInput>(initial ?? { ...BLANK, batchId: batches[0]?.id ?? "" });
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, setPending] = useState(false);
  const set = <K extends keyof SessionInput>(key: K, value: SessionInput[K]) => setValues((v) => ({ ...v, [key]: value }));
  const batch = batches.find((b) => b.id === values.batchId);
  const err = (key: keyof SessionInput) => (errors[key] ? <p id={`s-${key}-error`} role="alert" className="text-[12px] text-(--academy-danger-text)">{errors[key]}</p> : null);
  const a11y = (key: keyof SessionInput) => ({ "aria-invalid": Boolean(errors[key]), "aria-describedby": errors[key] ? `s-${key}-error` : undefined });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const result = academy ? await scheduleAcademyMeetingAction({ ...values, mode: "room" }) : sessionId ? await updateSessionAction(sessionId, values) : await scheduleSessionAction(values);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setMessage({ tone: "error", text: result.error?.message ?? "We couldn't save the session. Please try again." });
        return;
      }
      setErrors({});
      const note = result.outsideAvailability ? " Note: it's outside the availability you've set." : "";
      if (!sessionId && result.data && "id" in result.data) {
        router.push(academy ? `/academy/sessions/${result.data.id}?scheduled=1` : `/mentor/sessions/${result.data.id}?scheduled=1${result.outsideAvailability ? "&outside=1" : ""}`);
        return;
      }
      setMessage({ tone: "success", text: `Session saved.${note}` });
      router.refresh();
    } catch {
      setMessage({ tone: "error", text: "We couldn't reach the server. Check your connection and try again." });
    } finally {
      setPending(false);
    }
  }

  if (batches.length === 0) {
    return (
      <p className="glass-regular rounded-card px-6 py-6 text-sm text-ink-secondary">
        {academy
          ? "Your academy has no active batches yet. Create a batch, add students and assign a mentor, then schedule a meeting."
          : "You're not assigned to a batch yet. Your academy admin assigns mentors to batches; you can schedule sessions once you have one."}
      </p>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="glass-regular flex flex-col gap-5 rounded-card px-6 py-6">
      {message && (
        <Alert variant={message.tone === "error" ? "destructive" : "default"} role={message.tone === "error" ? "alert" : "status"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="s-batch">Batch</Label>
          <Select value={values.batchId} onValueChange={(v) => setValues((cur) => ({ ...cur, batchId: v, participantIds: [], studentId: "", mentorId: "" }))} disabled={pending}>
            <SelectTrigger id="s-batch" className="min-h-11 w-full" {...a11y("batchId")}><SelectValue /></SelectTrigger>
            <SelectContent>{batches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
          </Select>
          {err("batchId")}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="s-title">Title</Label>
          <Input id="s-title" className="min-h-11" value={values.title} onChange={(e) => set("title", e.target.value)} disabled={pending} {...a11y("title")} />
          {err("title")}
        </div>
      </div>
      {academy && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="s-mentor">Host mentor</Label>
          {(batch?.mentors ?? []).length === 0 ? (
            <p className="text-[13px] text-ink-secondary">No mentor is assigned to this batch yet. Assign one in Batches first.</p>
          ) : (
            <Select value={values.mentorId ?? ""} onValueChange={(v) => set("mentorId", v)} disabled={pending}>
              <SelectTrigger id="s-mentor" className="min-h-11 w-full" {...a11y("mentorId")}><SelectValue placeholder="Choose the mentor who will host" /></SelectTrigger>
              <SelectContent>{batch!.mentors!.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
            </Select>
          )}
          <p className="text-[12px] text-ink-secondary">The meeting is on the mentor&apos;s calendar and counts toward their {MEETING_DAILY_LIMIT_MINUTES}-minute daily limit.</p>
          {err("mentorId")}
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="s-description">Description (optional)</Label>
        <Textarea id="s-description" rows={3} value={values.description} onChange={(e) => set("description", e.target.value)} disabled={pending} {...a11y("description")} />
        {err("description")}
      </div>
      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-2 text-sm font-medium text-ink">When (IST)</legend>
        {values.mode === "room" && (
          <p className="text-[13px] text-ink-secondary sm:col-span-3">
            {MEETING_MIN_MINUTES}–{MEETING_MAX_MINUTES} minutes. {academy ? "Each mentor" : "You"} can host up to {MEETING_DAILY_LIMIT_MINUTES} minutes of live meetings a day. An end time earlier than the start means it ends after midnight.
          </p>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="s-date">Date</Label>
          <Input id="s-date" type="date" className="min-h-11" value={values.date} onChange={(e) => set("date", e.target.value)} disabled={pending} {...a11y("date")} />
          {err("date")}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="s-start">Starts</Label>
          <Input id="s-start" type="time" className="min-h-11" value={values.startTime} onChange={(e) => set("startTime", e.target.value)} disabled={pending} {...a11y("startTime")} />
          {err("startTime")}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="s-end">Ends</Label>
          <Input id="s-end" type="time" className="min-h-11" value={values.endTime} onChange={(e) => set("endTime", e.target.value)} disabled={pending} {...a11y("endTime")} />
          {err("endTime")}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium text-ink">Where</legend>
        {!academy && (
          <div className="flex flex-wrap gap-4">
            {MODES.map((m) => (
              <label key={m.value} className="flex min-h-11 items-center gap-2 text-sm text-ink">
                <input type="radio" name="s-mode" className="size-4 accent-(--brand-accent)" checked={values.mode === m.value} onChange={() => set("mode", m.value)} disabled={pending} />
                {m.label}
              </label>
            ))}
          </div>
        )}
        {err("mode")}
        {values.mode === "room" ? (
          <p className="text-[13px] text-ink-secondary">
            {academy ? "Live video room. " : ""}Students join from their Sessions page. Only the invited students can enter, and nothing is recorded.
          </p>
        ) : values.mode === "online" ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="s-link">Meeting link</Label>
            <Input id="s-link" type="url" placeholder="https://" className="min-h-11" value={values.meetingUrl} onChange={(e) => set("meetingUrl", e.target.value)} disabled={pending} {...a11y("meetingUrl")} />
            {err("meetingUrl")}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="s-location">Location</Label>
            <Input id="s-location" className="min-h-11" value={values.location} onChange={(e) => set("location", e.target.value)} disabled={pending} {...a11y("location")} />
            {err("location")}
          </div>
        )}
      </fieldset>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium text-ink">Who</legend>
        <div className="flex flex-wrap gap-4">
          <label className="flex min-h-11 items-center gap-2 text-sm text-ink">
            <input type="radio" name="s-who" className="size-4 accent-(--brand-accent)" checked={values.forWholeBatch} onChange={() => set("forWholeBatch", true)} disabled={pending} />
            {values.mode === "room" ? `The whole batch (up to ${MEETING_BATCH_MAX_STUDENTS} students)` : "The whole batch"}
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm text-ink">
            <input type="radio" name="s-who" className="size-4 accent-(--brand-accent)" checked={!values.forWholeBatch} onChange={() => set("forWholeBatch", false)} disabled={pending} />
            {values.mode === "room" ? "One student (one-to-one)" : "Selected students"}
          </label>
        </div>
        {values.mode === "room" && values.forWholeBatch && batch && batch.students.length > MEETING_BATCH_MAX_STUDENTS && (
          <p role="alert" className="text-[13px] text-(--academy-danger-text)">This batch has {batch.students.length} students; batch meetings allow at most {MEETING_BATCH_MAX_STUDENTS}.</p>
        )}
        {values.mode === "room" && !values.forWholeBatch && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="s-student">Student</Label>
            {(batch?.students ?? []).length === 0 ? (
              <p className="text-[13px] text-ink-secondary">This batch has no students yet.</p>
            ) : (
              <Select value={values.studentId} onValueChange={(v) => set("studentId", v)} disabled={pending}>
                <SelectTrigger id="s-student" className="min-h-11 w-full" {...a11y("studentId")}><SelectValue placeholder="Choose a student" /></SelectTrigger>
                <SelectContent>{batch!.students.map((st) => <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>)}</SelectContent>
              </Select>
            )}
            {err("studentId")}
          </div>
        )}
        {values.mode !== "room" && !values.forWholeBatch && (
          <div className="flex flex-col gap-1.5">
            {(batch?.students ?? []).length === 0 ? (
              <p className="text-[13px] text-ink-secondary">This batch has no students yet.</p>
            ) : (
              <ul className="grid gap-1 sm:grid-cols-2" aria-label="Students in this batch">
                {batch!.students.map((st) => (
                  <li key={st.id}>
                    <label className="flex min-h-11 items-center gap-2 text-sm text-ink">
                      <input
                        type="checkbox"
                        className="size-4 accent-(--brand-accent)"
                        checked={values.participantIds.includes(st.id)}
                        onChange={(e) => set("participantIds", e.target.checked ? [...values.participantIds, st.id] : values.participantIds.filter((p) => p !== st.id))}
                        disabled={pending}
                      />
                      {st.name}
                    </label>
                  </li>
                ))}
              </ul>
            )}
            {err("participantIds")}
          </div>
        )}
      </fieldset>
      <div className="flex justify-end">
        <Button type="submit" className="min-h-11" disabled={pending}>{pending ? "Saving…" : sessionId ? "Save changes" : academy ? "Schedule meeting" : "Schedule session"}</Button>
      </div>
    </form>
  );
}
