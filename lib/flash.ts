// A one-shot message that survives a client-side redirect: set before router.push, shown once by
// <FlashToast /> on the next screen, then cleared. Stored in sessionStorage (this tab only, gone when
// it closes) and never anything sensitive: just a sentence for the user. Storage can be blocked
// (private windows, site data cleared), so every access is guarded and the app works without it.

const KEY = "ec:flash";

export function setFlash(message: string): void {
  try {
    sessionStorage.setItem(KEY, message);
  } catch {
    // Storage unavailable: the user simply doesn't see the toast.
  }
}

export function takeFlash(): string | null {
  try {
    const message = sessionStorage.getItem(KEY);
    if (message) sessionStorage.removeItem(KEY);
    return message;
  } catch {
    return null;
  }
}
