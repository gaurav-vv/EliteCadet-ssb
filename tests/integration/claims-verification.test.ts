// @vitest-environment node
// getVerifiedUser() with the REAL Supabase SDK (createServerClient + getClaims) and a
// locally generated ES256 key pair. Only the network is faked: the JWKS endpoint serves
// the public key and every other Auth call is recorded. This proves the behaviour the
// proxy and session helper depend on: genuine tokens are accepted locally, and
// expired, altered, foreign-key and unknown-key tokens are not.
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createServerClient } from "@supabase/ssr";
import { getVerifiedUser } from "@/lib/supabase/claims";

const b64 = (data: string | Uint8Array) => Buffer.from(data).toString("base64url");
const SUB = "11111111-1111-4111-8111-111111111111";

let good: CryptoKeyPair;
let other: CryptoKeyPair;
let goodJwk: JsonWebKey;
const KID = "kid-good";

async function makeKey() {
  return crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]) as Promise<CryptoKeyPair>;
}

async function signJwt(key: CryptoKey, claims: Record<string, unknown>, kid = KID) {
  const header = b64(JSON.stringify({ alg: "ES256", typ: "JWT", kid }));
  const body = b64(JSON.stringify(claims));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, Buffer.from(`${header}.${body}`)));
  return `${header}.${body}.${b64(sig)}`;
}

const now = () => Math.floor(Date.now() / 1000);
const claimsFor = (exp: number) => ({ sub: SUB, email: "s@example.com", aud: "authenticated", role: "authenticated", exp, iat: now() - 60 });

let seq = 0;
// Each test uses its own project ref: the SDK caches signing keys per storage key.
function clientWith(token: string | null, expiresAt: number, fetchLog: string[]) {
  const ref = `ref${++seq}`;
  const url = `https://${ref}.supabase.co`;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const u = String(input);
      fetchLog.push(new URL(u).pathname + new URL(u).search);
      if (u.includes("/.well-known/jwks.json")) return Response.json({ keys: [{ ...goodJwk, kid: KID, alg: "ES256", use: "sig", key_ops: ["verify"] }] });
      if (u.includes("grant_type=refresh_token")) return Response.json({ error: "invalid_grant", error_description: "Invalid Refresh Token" }, { status: 400 });
      return Response.json({ message: "unexpected call" }, { status: 500 });
    }),
  );
  const cookies = new Map<string, string>();
  if (token) {
    const session = { access_token: token, refresh_token: "r", expires_at: expiresAt, expires_in: 3600, token_type: "bearer", user: { id: SUB, aud: "authenticated", email: "s@example.com", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" } };
    cookies.set(`sb-${ref}-auth-token`, `base64-${b64(JSON.stringify(session))}`);
  }
  return createServerClient(url, "public-anon-key", {
    cookies: { getAll: () => [...cookies].map(([name, value]) => ({ name, value })), setAll: () => {} },
  });
}

beforeAll(async () => {
  good = await makeKey();
  other = await makeKey();
  goodJwk = await crypto.subtle.exportKey("jwk", good.publicKey);
});
afterEach(() => vi.unstubAllGlobals());

describe("getVerifiedUser with the real SDK", () => {
  it("accepts a genuine token, verified locally: the signing keys are fetched, /user never is", async () => {
    const log: string[] = [];
    const token = await signJwt(good.privateKey, claimsFor(now() + 3600));
    const user = await getVerifiedUser(clientWith(token, now() + 3600, log));
    expect(user).toEqual({ id: SUB, email: "s@example.com" });
    expect(log.some((p) => p.includes("jwks.json"))).toBe(true);
    expect(log.some((p) => p.startsWith("/auth/v1/user"))).toBe(false);
  });

  it("does not need the network again once the signing keys are cached", async () => {
    const log: string[] = [];
    const ref = clientWith(await signJwt(good.privateKey, claimsFor(now() + 3600)), now() + 3600, log);
    await getVerifiedUser(ref);
    const first = log.length;
    await getVerifiedUser(ref);
    expect(log.length).toBe(first);
  });

  it("rejects a token whose payload was altered after signing", async () => {
    const token = await signJwt(good.privateKey, claimsFor(now() + 3600));
    const [h, , s] = token.split(".");
    const forged = `${h}.${b64(JSON.stringify({ ...claimsFor(now() + 3600), sub: "22222222-2222-4222-8222-222222222222" }))}.${s}`;
    expect(await getVerifiedUser(clientWith(forged, now() + 3600, []))).toBeNull();
  });

  it("rejects a token signed by a different key", async () => {
    const token = await signJwt(other.privateKey, claimsFor(now() + 3600));
    expect(await getVerifiedUser(clientWith(token, now() + 3600, []))).toBeNull();
  });

  it("rejects a token whose key id is not published", async () => {
    const token = await signJwt(good.privateKey, claimsFor(now() + 3600), "kid-unknown");
    expect(await getVerifiedUser(clientWith(token, now() + 3600, []))).toBeNull();
  });

  it("treats an expired session whose refresh fails as signed out", async () => {
    const log: string[] = [];
    const token = await signJwt(good.privateKey, claimsFor(now() - 600));
    expect(await getVerifiedUser(clientWith(token, now() - 600, log))).toBeNull();
    // It tried to refresh once and was refused; it did not fall back to trusting the stale token.
    expect(log.some((p) => p.includes("grant_type=refresh_token"))).toBe(true);
  });

  it("is signed out, with no network call, when there is no session cookie", async () => {
    const log: string[] = [];
    expect(await getVerifiedUser(clientWith(null, 0, log))).toBeNull();
    expect(log).toEqual([]);
  });
});
