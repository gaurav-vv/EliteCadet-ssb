const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2026-10-07T09:12:00Z" → "7 Oct 2026". Uses the date part only, so server and
// client render the same text (no time-zone-dependent hydration mismatch).
export function formatDay(timestamp: string | null): string | null {
  if (!timestamp) return null;
  const [y, m, d] = timestamp.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
