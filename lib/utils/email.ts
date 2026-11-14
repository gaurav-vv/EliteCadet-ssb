// The one email-format check, shared by the browser auth forms and every
// server validator (invites, academy contact, demo requests).
//
// Format only: it can't tell whether an inbox exists. Ownership is proven by
// the emailed link (invites, password reset, and sign-up confirmation when
// "Confirm email" is on). See docs/email.md.

const LOCAL_RE = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
const LABEL_RE = /^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?$/;

export function isValidEmail(value: string): boolean {
  if (value.length > 254) return false;
  const at = value.lastIndexOf("@");
  if (at < 1 || at !== value.indexOf("@")) return false;
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  if (local.length > 64 || !LOCAL_RE.test(local)) return false;
  const labels = domain.split(".");
  if (labels.length < 2 || labels.some((l) => l.length > 63 || !LABEL_RE.test(l))) return false;
  return /^[A-Za-z]{2,}$/.test(labels[labels.length - 1]);
}

// Misspellings of the providers most students use. Only exact matches, so a
// real but unusual domain is never "corrected".
const DOMAIN_TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.cm": "gmail.com",
  "gmail.om": "gmail.com",
  "gmaill.com": "gmail.com",
  "gnail.com": "gmail.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "yahoo.con": "yahoo.com",
  "yahoo.co": "yahoo.com",
  "hotmial.com": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "outlok.com": "outlook.com",
  "outlook.con": "outlook.com",
  "iclod.com": "icloud.com",
  "icloud.con": "icloud.com",
  "rediffmail.con": "rediffmail.com",
  "redifmail.com": "rediffmail.com",
};

// "name@gmial.com" → "name@gmail.com"; null when nothing looks mistyped.
export function suggestEmail(value: string): string | null {
  const email = value.trim();
  const at = email.lastIndexOf("@");
  if (at < 1) return null;
  const fix = DOMAIN_TYPOS[email.slice(at + 1).toLowerCase()];
  return fix ? `${email.slice(0, at)}@${fix}` : null;
}
