import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { buildInterviewMessage, generateQuestion, type InterviewInput } from "../src/engine/question.js";
import { getRubric } from "../src/rubrics/registry.js";
import { fakeClient, message } from "./helpers.js";

const SETTINGS = { model: "claude-opus-5-5", effort: "low" as const, maxTokens: 4000, timeoutMs: 45000 };
const INPUT: InterviewInput = {
  session: { mode: "mock", topic: null, max_questions: 8, context: { hometown: "Pune", ignored: 5 } },
  items: [{ prompt: "Tell us about yourself.", response: "I am from Pune and I captain my college hockey team." }],
};
const reply = (json: unknown) => fakeClient(() => message({ json }));

describe("AI interviewer", () => {
  it("sends the transcript and shared PIQ as data, with a cached system prompt, low effort and a refusal fallback", async () => {
    const { client, calls } = reply({ question: "What did captaining the team teach you?", kind: "follow_up", follow_up_type: "depth" });
    const r = await generateQuestion(client, INPUT, SETTINGS);
    expect(r).toMatchObject({ ok: true, question: "What did captaining the team teach you?", kind: "follow_up", followUpType: "depth" });
    const { body } = calls[0];
    expect(body.output_config?.effort).toBe("low");
    expect(body.fallbacks).toBe("default");
    expect((body.system as Anthropic.Beta.BetaTextBlockParam[])[0].cache_control).toEqual({ type: "ephemeral" });
    const user = JSON.stringify(body.messages);
    expect(user).toContain("<transcript>");
    expect(user).toContain("hometown: Pune");
    expect(user).not.toContain("ignored");
    expect(user).toContain("question 2 of 8");
  });

  it("notes unanswered questions and stays on the topic in topic mode", () => {
    const text = buildInterviewMessage({ session: { mode: "topic", topic: "Hobbies and sports", max_questions: 5, context: {} }, items: [{ prompt: "What do you do in your free time?", response: "" }] });
    expect(text).toContain("(no answer)");
    expect(text).toContain("Topic: Hobbies and sports");
  });

  it.each([
    [{ question: "Why?", kind: "follow_up", follow_up_type: "depth" }, "malformed_output"],
    [{ question: "Tell us more about your hockey team captaincy.", kind: "follow_up", follow_up_type: null }, "malformed_output"],
    [{ question: "What do your friends think of you?", kind: "new_topic", follow_up_type: "depth" }, "malformed_output"],
    [{ question: "Do you think you will be selected at the SSB this time?", kind: "new_topic", follow_up_type: null }, "guardrail"],
    [{ question: "Why? How? When? Where did this happen?", kind: "follow_up", follow_up_type: "clarification" }, "guardrail"],
    [{ question: "Tell us about yourself.", kind: "new_topic", follow_up_type: null }, "repeated_question"],
  ])("rejects %j as %s", async (json, code) => {
    expect(await generateQuestion(reply(json).client, INPUT, SETTINGS)).toMatchObject({ ok: false, code, retryable: true });
  });

  it("a refusal is final (the bank takes over)", async () => {
    expect(await generateQuestion(fakeClient(() => message({ stop_reason: "refusal" })).client, INPUT, SETTINGS)).toMatchObject({ ok: false, code: "refusal", retryable: false });
  });

  it("has an interview feedback rubric about the answers, not the person", () => {
    const r = getRubric("interview", 1)!;
    expect(r.dimensions.map((d) => d.id)).toEqual(["relevance", "specificity", "structure", "consistency", "reflection"]);
    for (const d of r.dimensions) expect(d.looksFor).not.toMatch(/\b(personality|trait|confident person|introvert)\b/i);
  });
});
