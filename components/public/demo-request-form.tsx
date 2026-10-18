"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleCheck } from "lucide-react";
import { submitDemoRequestAction } from "@/lib/actions/demo-requests";
import type { DemoFieldErrors } from "@/lib/server/demo-requests/validation";
import { DEMO_INTEREST_LABELS, type DemoInterest, type DemoRequestInput } from "@/types/demo-requests";

const INTERESTS = Object.keys(DEMO_INTEREST_LABELS) as DemoInterest[];

export function DemoRequestForm({ initialInterest }: { initialInterest: DemoInterest }) {
  const [values, setValues] = useState<DemoRequestInput>({
    fullName: "",
    email: "",
    phone: "",
    organisation: "",
    interest: initialInterest,
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<DemoFieldErrors>({});

  const set = (key: keyof DemoRequestInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("sending");
    setErrorMessage(null);
    setFieldErrors({});
    try {
      const result = await submitDemoRequestAction(values);
      if (result.ok) {
        setStatus("sent");
        return;
      }
      setFieldErrors(result.fieldErrors ?? {});
      setErrorMessage(result.error?.message ?? "We couldn't send your request. Please try again.");
    } catch {
      setErrorMessage("We couldn't reach the server. Check your connection and try again.");
    }
    setStatus("error");
  }

  if (status === "sent") {
    return (
      <div role="status" className="flex flex-col items-start gap-3 rounded-[var(--site-radius-md)] bg-white p-8 shadow-[var(--site-shadow)]">
        <CircleCheck aria-hidden="true" className="size-8 text-[var(--site-accent-green)]" />
        <h2 className="text-xl font-semibold text-[var(--site-navy)]">Thanks — your request has been sent</h2>
        <p className="text-[0.9375rem] text-[var(--site-muted)]">We&apos;ll contact you at {values.email} to arrange your demo.</p>
        <Link href="/" className="site-btn site-btn-secondary mt-2">
          Back to home
        </Link>
      </div>
    );
  }

  const sending = status === "sending";
  const field = (key: keyof DemoRequestInput, label: string, input: React.ReactNode) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`demo-${key}`} className="text-sm font-medium text-[var(--site-navy)]">
        {label}
      </label>
      {input}
      {fieldErrors[key] && (
        <p id={`demo-${key}-error`} className="text-sm text-[var(--site-danger)]">
          {fieldErrors[key]}
        </p>
      )}
    </div>
  );
  const inputProps = (key: keyof DemoRequestInput) => ({
    id: `demo-${key}`,
    name: key,
    value: values[key],
    onChange: set(key),
    disabled: sending,
    className: "site-input",
    "aria-invalid": fieldErrors[key] ? true : undefined,
    "aria-describedby": fieldErrors[key] ? `demo-${key}-error` : undefined,
  });

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5 rounded-[var(--site-radius-md)] bg-white p-6 shadow-[var(--site-shadow)] sm:p-8">
      {errorMessage && (
        <p role="alert" className="rounded-[var(--site-radius-sm)] border border-[var(--site-danger)] px-3 py-2 text-sm text-[var(--site-danger)]">
          {errorMessage}
        </p>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium text-[var(--site-navy)]">I&apos;m interested as</legend>
        {INTERESTS.map((interest) => (
          <label key={interest} className="flex min-h-11 cursor-pointer items-center gap-3 text-[0.9375rem] text-[var(--site-text)]">
            <input
              type="radio"
              name="interest"
              value={interest}
              checked={values.interest === interest}
              onChange={() => setValues((v) => ({ ...v, interest }))}
              disabled={sending}
              className="size-4 accent-[var(--site-navy)]"
            />
            {DEMO_INTEREST_LABELS[interest]}
          </label>
        ))}
        {fieldErrors.interest && <p className="text-sm text-[var(--site-danger)]">{fieldErrors.interest}</p>}
      </fieldset>

      {field("fullName", "Full name", <input {...inputProps("fullName")} autoComplete="name" required />)}
      {field("email", "Email", <input {...inputProps("email")} type="email" autoComplete="email" required />)}
      {field("phone", "Phone (optional)", <input {...inputProps("phone")} type="tel" autoComplete="tel" />)}
      {field(
        "organisation",
        values.interest === "academy" ? "Academy or institution" : "Academy or institution (optional)",
        <input {...inputProps("organisation")} autoComplete="organization" required={values.interest === "academy"} />,
      )}
      {field("message", "Anything we should know? (optional)", <textarea {...inputProps("message")} rows={4} />)}

      <button type="submit" className="site-btn site-btn-primary" disabled={sending}>
        {sending ? "Sending…" : "Request Demo"}
      </button>
    </form>
  );
}
