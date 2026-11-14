// One timed HTTP request. Redirects are NOT followed (so a redirect is measured and
// asserted, not hidden). `ms` is time until the full body is read; `ttfbMs` is time
// until the response headers arrive. Bodies are measured, never stored or logged.
export async function timedRequest(name, url, { headers = {}, method = "GET", timeoutMs = 15000 } = {}) {
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method, headers, redirect: "manual", signal: controller.signal });
    const ttfbMs = performance.now() - started;
    const body = await res.arrayBuffer();
    const ms = performance.now() - started;
    return {
      name,
      status: res.status,
      ok: res.status < 500 && res.status !== 429,
      ms,
      ttfbMs,
      bytes: body.byteLength,
      location: res.headers.get("location"),
      retryAfter: res.headers.get("retry-after"),
      cacheControl: res.headers.get("cache-control"),
      vercelCache: res.headers.get("x-vercel-cache"),
      timedOut: false,
      text: () => new TextDecoder().decode(body),
    };
  } catch (error) {
    const timedOut = error?.name === "AbortError";
    return { name, status: 0, ok: false, ms: performance.now() - started, ttfbMs: null, bytes: 0, location: null, retryAfter: null, cacheControl: null, vercelCache: null, timedOut, text: () => "" };
  } finally {
    clearTimeout(timer);
  }
}
