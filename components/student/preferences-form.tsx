"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { savePreferencesAction } from "@/lib/actions/student";
import { ENTRY_SCHEMES, PREPARATION_STAGES, STUDY_MINUTES, type PreferencesInput, type StudentPreferences } from "@/types/student";

type Errors = Partial<Record<keyof PreferencesInput, string>>;

// Onboarding and the profile page share this form (PRD §9.1–9.2): saved to
// the account, editable any time. After onboarding it goes to `next`.
export function PreferencesForm({ initial, mode, next }: { initial: StudentPreferences; mode: "onboarding" | "profile"; next?: string }) {
  const router = useRouter();
  const [values, setValues] = useState({
    fullName: initial.fullName,
    entryScheme: initial.entryScheme ?? "",
    targetSsbDate: initial.targetSsbDate ?? "",
    preparationStage: initial.preparationStage ?? "",
    preferredLanguage: initial.preferredLanguage,
    dailyStudyMinutes: initial.dailyStudyMinutes ? String(initial.dailyStudyMinutes) : "",
    goals: initial.goals,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState(false);
  const set = (k: keyof typeof values) => (v: string) => setValues((s) => ({ ...s, [k]: v }));
  const err = (k: keyof PreferencesInput) =>
    errors[k] ? (
      <p id={`pref-${k}-error`} role="alert" className="text-[13px] text-danger">
        {errors[k]}
      </p>
    ) : null;
  const aria = (k: keyof PreferencesInput) => ({ "aria-invalid": errors[k] ? true : undefined, "aria-describedby": errors[k] ? `pref-${k}-error` : undefined });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    const result = await savePreferencesAction({ ...values, dailyStudyMinutes: values.dailyStudyMinutes ? Number(values.dailyStudyMinutes) : null });
    setPending(false);
    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      setMessage({ ok: false, text: result.error?.message ?? "We couldn't save that. Please try again." });
      return;
    }
    setErrors({});
    if (mode === "onboarding") router.push(next ?? "/student");
    else {
      setMessage({ ok: true, text: "Saved. Your roadmap now uses these details." });
      router.refresh();
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pref-name">Your name</Label>
        <Input id="pref-name" value={values.fullName} onChange={(e) => set("fullName")(e.target.value)} className="min-h-11" {...aria("fullName")} />
        {err("fullName")}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pref-scheme">Entry you&apos;re preparing for</Label>
          <Select value={values.entryScheme} onValueChange={set("entryScheme")}>
            <SelectTrigger id="pref-scheme" className="min-h-11" {...aria("entryScheme")}>
              <SelectValue placeholder="Choose an entry" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ENTRY_SCHEMES).map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {err("entryScheme")}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pref-date">Target SSB date (optional)</Label>
          <Input id="pref-date" type="date" value={values.targetSsbDate} onChange={(e) => set("targetSsbDate")(e.target.value)} className="min-h-11" {...aria("targetSsbDate")} />
          {err("targetSsbDate")}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pref-stage">Where you are now</Label>
          <Select value={values.preparationStage} onValueChange={set("preparationStage")}>
            <SelectTrigger id="pref-stage" className="min-h-11" {...aria("preparationStage")}>
              <SelectValue placeholder="Choose one" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PREPARATION_STAGES).map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {err("preparationStage")}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pref-minutes">Time you can give each day</Label>
          <Select value={values.dailyStudyMinutes} onValueChange={set("dailyStudyMinutes")}>
            <SelectTrigger id="pref-minutes" className="min-h-11" {...aria("dailyStudyMinutes")}>
              <SelectValue placeholder="Choose a time" />
            </SelectTrigger>
            <SelectContent>
              {STUDY_MINUTES.map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {m < 60 ? `${m} minutes` : `${m / 60} hour${m > 60 ? "s" : ""}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {err("dailyStudyMinutes")}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pref-language">Preferred language</Label>
          <Select value={values.preferredLanguage} onValueChange={set("preferredLanguage")}>
            <SelectTrigger id="pref-language" className="min-h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="hi">हिन्दी (Hindi) — coming soon, English for now</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pref-goals">Your goals (optional)</Label>
        <Textarea id="pref-goals" value={values.goals} onChange={(e) => set("goals")(e.target.value)} maxLength={500} className="min-h-20" {...aria("goals")} />
        {err("goals")}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending} className="min-h-11">
          {pending ? "Saving…" : mode === "onboarding" ? "Continue" : "Save"}
        </Button>
        {message && (
          <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-[13px] text-ink" : "text-[13px] text-danger"}>
            {message.text}
          </p>
        )}
      </div>
    </form>
  );
}
