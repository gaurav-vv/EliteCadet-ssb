// Integration: the AI interview room with its server actions mocked.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const actions = vi.hoisted(() => ({ answer: vi.fn(), skip: vi.fn(), refresh: vi.fn() }));
vi.mock("@/lib/actions/interview", () => ({ answerTurnAction: actions.answer, skipWaitAction: actions.skip }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: actions.refresh, push: vi.fn() }) }));

import { InterviewRoom } from "@/components/interview/interview-room";
import type { InterviewView } from "@/types/interview";

const base: InterviewView = { id: "s1", mode: "guided", topic: null, maxQuestions: 5, status: "active", createdAt: "t", waitingSince: null, feedback: { status: "none" }, turns: [] };
const turn = (seq: number, over: Partial<InterviewView["turns"][number]> = {}) => ({ id: `t${seq}`, seq, question: `Question ${seq}?`, kind: "opening" as const, followUpType: null, answer: null, answeredAt: null, ...over });

beforeEach(() => {
  actions.answer.mockReset().mockResolvedValue({ ok: true, data: null });
  actions.skip.mockReset().mockResolvedValue({ ok: true, data: null });
  actions.refresh.mockReset();
});
afterEach(() => vi.useRealTimers());

describe("InterviewRoom", () => {
  it("answers the open question, showing why a follow-up was asked in guided mode", async () => {
    render(<InterviewRoom view={{ ...base, turns: [turn(1, { answer: "I am from Pune.", answeredAt: "t" }), turn(2, { kind: "follow_up", followUpType: "evidence" })] }} />);
    expect(screen.getByText("I am from Pune.")).toBeInTheDocument();
    expect(screen.getAllByText("Follow-up: asks for a real example").length).toBeGreaterThan(0);
    await userEvent.type(screen.getByRole("textbox", { name: "Your answer" }), "I led the NCC camp.");
    await userEvent.click(screen.getByRole("button", { name: "Answer" }));
    expect(actions.answer).toHaveBeenCalledWith("s1", "t2", "I led the NCC camp.");
    await waitFor(() => expect(actions.refresh).toHaveBeenCalled());
  });

  it("keeps the answer on screen when saving fails", async () => {
    actions.answer.mockResolvedValueOnce({ ok: false, error: { code: "network_error", message: "We couldn't save your answer. It's still here — please try again." } });
    render(<InterviewRoom view={{ ...base, turns: [turn(1)] }} />);
    await userEvent.type(screen.getByRole("textbox", { name: "Your answer" }), "Draft");
    await userEvent.click(screen.getByRole("button", { name: "Answer" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("still here");
    expect(screen.getByRole("textbox", { name: "Your answer" })).toHaveValue("Draft");
  });

  it("mock mode hides follow-up reasons and submits automatically when time runs out", async () => {
    vi.useFakeTimers();
    render(<InterviewRoom view={{ ...base, mode: "mock", maxQuestions: 8, turns: [turn(1, { answer: "a", answeredAt: "t" }), turn(2, { kind: "follow_up", followUpType: "depth" })] }} />);
    expect(screen.queryByText("Follow-up: goes deeper into your last answer")).not.toBeInTheDocument();
    expect(screen.getByText("2:00 left")).toBeInTheDocument();
    for (let i = 0; i < 120; i++) act(() => void vi.advanceTimersByTime(1000));
    expect(actions.answer).toHaveBeenCalledWith("s1", "t2", "");
  });

  it("while the next question is prepared, offers to skip after a while", async () => {
    vi.useFakeTimers();
    render(<InterviewRoom view={{ ...base, waitingSince: new Date().toISOString(), turns: [turn(1, { answer: "a", answeredAt: new Date().toISOString() })] }} />);
    expect(screen.getByRole("status")).toHaveTextContent("preparing the next question");
    expect(screen.queryByRole("button", { name: "Skip to the next question" })).not.toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(46_000));
    expect(screen.getByRole("button", { name: "Skip to the next question" })).toBeInTheDocument();
  });

  it("shows the feedback once the interview is complete", () => {
    render(<InterviewRoom view={{ ...base, status: "completed", feedback: { status: "pending" }, turns: [turn(1, { answer: "a", answeredAt: "t" })] }} />);
    expect(screen.getByText("Feedback is being prepared")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
