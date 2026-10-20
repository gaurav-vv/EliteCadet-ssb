import { localMailboxUrl } from "@/lib/supabase/env";

// Shown next to "sent" confirmations only when the app runs against a LOCAL
// Supabase stack, so a captured email is never mistaken for a delivered one.
export function LocalMailboxNote() {
  const mailbox = localMailboxUrl();
  if (!mailbox) return null;
  return (
    <p className="text-[13px] text-ink-secondary">
      Local development: this email was not sent to a real inbox. Open{" "}
      <a href={mailbox} target="_blank" rel="noopener noreferrer" className="text-brand-accent underline">
        the local mailbox (Mailpit)
        <span className="sr-only"> (opens in a new tab)</span>
      </a>{" "}
      to read it. Real delivery needs SMTP — see docs/email.md.
    </p>
  );
}
