"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createRequestAction } from "@/lib/actions/mentor-content";
import { CONTENT_CATEGORIES, CONTENT_TYPES, type ContentRequestInput } from "@/types/content";

const EMPTY: ContentRequestInput = { title: "", details: "", category: "psychology", type: "study_material", neededBy: "" };

// Ask the platform team to create content. They'll reply with a quote you
// accept or decline; nothing is charged in the app.
export function RequestForm() {
  const router = useRouter();
  const [values, setValues] = useState<ContentRequestInput>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof ContentRequestInput, string>>>({});
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, setPending] = useState(false);
  const set = (key: keyof ContentRequestInput) => (value: string) => setValues((v) => ({ ...v, [key]: value }));
  const err = (key: keyof ContentRequestInput) => (errors[key] ? <p role="alert" className="text-[12px] text-(--academy-danger-text)">{errors[key]}</p> : null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const result = await createRequestAction(values);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setMessage({ tone: "error", text: result.error?.message ?? "We couldn't send your request. Please try again." });
        return;
      }
      setErrors({});
      setValues(EMPTY);
      setMessage({ tone: "success", text: "Request sent. You'll see a quote here once our team reviews it." });
      router.refresh();
    } catch {
      setMessage({ tone: "error", text: "We couldn't reach the server. Check your connection and try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="glass-regular flex flex-col gap-4 rounded-card px-6 py-6">
      <h2 className="text-[18px] font-semibold text-ink">Request content from our team</h2>
      {message && (
        <Alert variant={message.tone === "error" ? "destructive" : "default"} role={message.tone === "error" ? "alert" : "status"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="req-title">What do you need?</Label>
        <Input id="req-title" className="min-h-11" value={values.title} onChange={(e) => set("title")(e.target.value)} disabled={pending} aria-invalid={Boolean(errors.title)} />
        {err("title")}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="req-details">Details</Label>
        <Textarea id="req-details" rows={4} value={values.details} onChange={(e) => set("details")(e.target.value)} disabled={pending} aria-invalid={Boolean(errors.details)} />
        {err("details")}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="req-category">Category</Label>
          <Select value={values.category} onValueChange={set("category")} disabled={pending}>
            <SelectTrigger id="req-category" className="min-h-11 w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(CONTENT_CATEGORIES).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="req-type">Type</Label>
          <Select value={values.type} onValueChange={set("type")} disabled={pending}>
            <SelectTrigger id="req-type" className="min-h-11 w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(CONTENT_TYPES).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="req-needed">Needed by (optional)</Label>
          <Input id="req-needed" type="date" className="min-h-11" value={values.neededBy} onChange={(e) => set("neededBy")(e.target.value)} disabled={pending} aria-invalid={Boolean(errors.neededBy)} />
          {err("neededBy")}
        </div>
      </div>
      <p className="text-[12px] text-ink-secondary">This is a paid service. We&apos;ll quote a fee first; if you accept, it&apos;s deducted from your payout by our team — nothing is charged here.</p>
      <div className="flex justify-end">
        <Button type="submit" className="min-h-11" disabled={pending}>{pending ? "Sending…" : "Send request"}</Button>
      </div>
    </form>
  );
}
