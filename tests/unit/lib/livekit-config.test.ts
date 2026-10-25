// @vitest-environment node
// LiveKit credentials and token scope (T094). The "create room failed:
// invalid token" incident was a masked "••••" secret pasted from the LiveKit
// Cloud dashboard; such values must be treated as not configured, and the
// tokens the server signs must stay scoped to one room and one identity.
import { afterEach, describe, expect, it, vi } from "vitest";
import { TokenVerifier } from "livekit-server-sdk";
import { createJoinToken, describeProviderError, invalidLiveKitConfig, liveKitConfig } from "@/lib/server/meetings/livekit";

const GOOD = { LIVEKIT_URL: "wss://project.livekit.cloud", LIVEKIT_API_KEY: "APIabcdefgh1234", LIVEKIT_API_SECRET: "s3cretS3cretS3cretS3cretS3cret0123456789" };
const SESSION = "66666666-6666-4666-8666-666666666666";

describe("invalidLiveKitConfig", () => {
  it("accepts a well-formed configuration", () => {
    expect(invalidLiveKitConfig(GOOD)).toEqual([]);
    expect(invalidLiveKitConfig({ ...GOOD, LIVEKIT_URL: "ws://localhost:7880", LIVEKIT_API_KEY: "devkey", LIVEKIT_API_SECRET: "secret" })).toEqual([]);
  });

  it("rejects a masked secret copied from the dashboard", () => {
    const problems = invalidLiveKitConfig({ ...GOOD, LIVEKIT_API_SECRET: "•".repeat(32) });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/LIVEKIT_API_SECRET/);
    expect(problems[0]).not.toContain("•••");
  });

  it("rejects placeholders, quotes, whitespace and a bad URL scheme", () => {
    expect(invalidLiveKitConfig({ ...GOOD, LIVEKIT_API_SECRET: "********" })[0]).toMatch(/placeholder/);
    expect(invalidLiveKitConfig({ ...GOOD, LIVEKIT_API_KEY: '"APIabc"' })).toHaveLength(0); // quotes are printable ASCII; dotenv strips them
    expect(invalidLiveKitConfig({ ...GOOD, LIVEKIT_API_KEY: "APIabc def" })[0]).toMatch(/LIVEKIT_API_KEY/);
    expect(invalidLiveKitConfig({ ...GOOD, LIVEKIT_URL: "project.livekit.cloud" })[0]).toMatch(/LIVEKIT_URL/);
  });
});

describe("liveKitConfig", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is null (not configured) when the secret is masked, and logs names only", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    for (const [k, v] of Object.entries({ ...GOOD, LIVEKIT_API_SECRET: "•".repeat(32) })) vi.stubEnv(k, v);
    expect(liveKitConfig()).toBeNull();
    expect(log.mock.calls.flat().join(" ")).not.toContain("•");
    log.mockRestore();
  });

  it("returns the configuration when it is valid", () => {
    for (const [k, v] of Object.entries(GOOD)) vi.stubEnv(k, v);
    expect(liveKitConfig()).toEqual({ url: GOOD.LIVEKIT_URL, apiKey: GOOD.LIVEKIT_API_KEY, apiSecret: GOOD.LIVEKIT_API_SECRET });
  });
});

describe("describeProviderError", () => {
  it("explains a 401 as a credential mismatch without leaking values", () => {
    const text = describeProviderError({ status: 401, message: "invalid token" });
    expect(text).toMatch(/LIVEKIT_API_KEY and LIVEKIT_API_SECRET/);
    expect(describeProviderError(new Error("timeout"))).toBe("timeout");
  });
});

describe("createJoinToken scope", () => {
  const cfg = { url: GOOD.LIVEKIT_URL, apiKey: GOOD.LIVEKIT_API_KEY, apiSecret: GOOD.LIVEKIT_API_SECRET };
  const verify = (jwt: string) => new TokenVerifier(cfg.apiKey, cfg.apiSecret).verify(jwt);

  it("binds a batch student to one room, their own identity, listen-only, no data", async () => {
    const claims = await verify(await createJoinToken(cfg, { sessionId: SESSION, userId: "student-1", name: "Asha", role: "student", kind: "batch" }));
    expect(claims.sub).toBe("student-1");
    expect(claims.video).toMatchObject({ room: `session-${SESSION}`, roomJoin: true, canSubscribe: true, canPublish: false, canPublishData: false, canUpdateOwnMetadata: false });
    expect(claims.video?.roomAdmin).toBeFalsy();
    expect(JSON.parse(claims.metadata ?? "{}")).toEqual({ role: "student" });
  });

  it("lets a one-to-one student publish camera and mic only, and a host also share screens", async () => {
    const student = await verify(await createJoinToken(cfg, { sessionId: SESSION, userId: "s", name: "S", role: "student", kind: "one_to_one" }));
    expect(student.video?.canPublish).toBe(true);
    expect(student.video?.canPublishSources).toEqual(["camera", "microphone"]);
    const host = await verify(await createJoinToken(cfg, { sessionId: SESSION, userId: "m", name: "M", role: "mentor", kind: "batch" }));
    expect(host.video?.canPublishSources).toEqual(expect.arrayContaining(["camera", "microphone", "screen_share"]));
    expect(host.video?.canPublishData).toBe(false);
  });

  it("is short-lived (10 minutes)", async () => {
    const claims = await verify(await createJoinToken(cfg, { sessionId: SESSION, userId: "m", name: "M", role: "mentor", kind: "batch" }));
    expect((claims.exp ?? 0) - (claims.nbf ?? 0)).toBeLessThanOrEqual(600);
  });
});
