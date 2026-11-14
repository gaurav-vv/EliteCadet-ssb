// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createJoinToken } from "@/lib/server/meetings/livekit";

const cfg = { url: "wss://lk.test", apiKey: "key", apiSecret: "a-test-secret-that-is-long-enough-0123" };
const grantOf = (jwt: string) => JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString()).video;

describe("join token media grants", () => {
  it.each(["batch", "one_to_one"] as const)("lets a student in a %s meeting publish mic and camera, but not share screen or data", async (kind) => {
    const grant = grantOf(await createJoinToken(cfg, { sessionId: "11111111-1111-4111-8111-111111111111", userId: "u1", name: "S", role: "student", kind }));
    expect(grant.canPublish).toBe(true);
    expect(grant.canPublishSources.sort()).toEqual(["camera", "microphone"]);
    expect(grant.canPublishData).toBe(false);
  });

  it("lets a host share their screen", async () => {
    const grant = grantOf(await createJoinToken(cfg, { sessionId: "11111111-1111-4111-8111-111111111111", userId: "m1", name: "M", role: "mentor", kind: "batch" }));
    expect(grant.canPublishSources).toContain("screen_share");
  });
});

describe("missingLiveKitConfig", () => {
  it("treats a secret copied while hidden (•••) or quoted as unset, naming only the variable", async () => {
    const { missingLiveKitConfig } = await import("@/lib/server/meetings/livekit");
    const env = { ...process.env };
    process.env.LIVEKIT_URL = "wss://x.livekit.cloud";
    process.env.LIVEKIT_API_KEY = "APIabc123";
    process.env.LIVEKIT_API_SECRET = "•".repeat(32);
    expect(missingLiveKitConfig()).toEqual(["LIVEKIT_API_SECRET"]);
    process.env.LIVEKIT_API_SECRET = '"abc"';
    expect(missingLiveKitConfig()).toEqual(["LIVEKIT_API_SECRET"]);
    process.env.LIVEKIT_API_SECRET = "realSecretValue123";
    expect(missingLiveKitConfig()).toEqual([]);
    process.env = env;
  });
});
