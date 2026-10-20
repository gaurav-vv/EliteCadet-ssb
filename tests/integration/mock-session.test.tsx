// Integration: MockSession wired to the real CarouselRunner, countdown hook,
// question picker and PIQ store (specs.md §6.4b); the server actions that
// save runs to the account are mocked.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const actions = vi.hoisted(() => ({ submit: vi.fn(), review: vi.fn() }));
vi.mock("@/lib/actions/practice", () => ({ submitAttemptAction: actions.submit, saveMockReviewAction: actions.review }));

import { MockSession } from "@/components/practice/mock-session";
import { writePiq } from "@/lib/student/piq-storage";
import type { MockAttemptRecord } from "@/types/practice";

const QUESTIONS = Array.from({ length: 10 }, (_, i) => ({
  id: `int-${i + 1}`,
  prompt: i === 0 ? "Tell us about yourself." : `Question ${i + 1}?`,
  guidance: { assesses: `Checks ${i + 1}`, tips: ["Be specific."] },
}));

// useCountdown schedules each 1s tick after React re-renders, so time has to
// advance one tick per act() for the countdown to keep running.
function advanceSeconds(seconds: number) {
  for (let i = 0; i < seconds; i++) {
    act(() => {
      vi.advanceTimersByTime(1000);
    });
  }
}

function renderMock(kind: "interview" | "conference" = "interview", initialLast: MockAttemptRecord | null = null) {
  return render(
    <MockSession
      kind={kind}
      slug={kind}
      initialLast={initialLast}
      title={kind === "interview" ? "Mock interview" : "Mock conference"}
      intro="Intro text."
      tips={["A tip."]}
      questions={QUESTIONS}
      selfReview={["Specific example"]}
      backHref="/student/practice/interview"
      backLabel="Interview"
    />,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  actions.submit.mockReset();
  actions.review.mockReset();
  actions.submit.mockResolvedValue({ ok: true, data: { id: "11111111-1111-4111-8111-111111111111", correct: null, total: 8, submittedAt: "2026-10-08T00:00:00Z" } });
  actions.review.mockResolvedValue({ ok: true, data: null });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("MockSession", () => {
  it("shows the pacing before starting", () => {
    renderMock();
    expect(screen.getByText(/8 questions, 2 minutes each/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Review last attempt" })).not.toBeInTheDocument();
  });

  it("runs question by question with Next question, then reviews every answer", async () => {
    const user = userEvent.setup();
    renderMock();
    await user.click(screen.getByRole("button", { name: "Start mock interview" }));

    expect(screen.getByText("Tell us about yourself.")).toBeInTheDocument();
    expect(screen.getByText("Item 1 of 8")).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "Your response" }), "I am a cadet from Pune.");
    for (let i = 0; i < 7; i++) await user.click(screen.getByRole("button", { name: "Next question" }));
    await user.click(screen.getByRole("button", { name: "Finish" }));

    expect(screen.getByRole("heading", { name: "Mock interview: review" })).toBeInTheDocument();
    expect(screen.getByText("You answered 1 of 8 questions.", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("I am a cadet from Pune.")).toBeInTheDocument();
    expect(screen.getAllByText("No answer")).toHaveLength(7);
    expect(screen.getAllByText("What assessors look for")).toHaveLength(8);
  });

  it("moves on by itself when the timer runs out", async () => {
    vi.useFakeTimers();
    renderMock("conference");
    act(() => {
      screen.getByRole("button", { name: "Start mock conference" }).click();
    });
    expect(screen.getByText("Item 1 of 4")).toBeInTheDocument();
    advanceSeconds(60);
    expect(screen.getByText("Item 2 of 4")).toBeInTheDocument();
    advanceSeconds(3 * 60);
    expect(screen.getByRole("heading", { name: "Mock conference: review" })).toBeInTheDocument();
  });

  it("includes up to 3 questions from a saved PIQ in the interview", async () => {
    writePiq({ hometown: "Pune", sports: "Hockey", hobbies: "Chess", achievements: "Debate winner" });
    const user = userEvent.setup();
    renderMock();
    await user.click(screen.getByRole("button", { name: "Start mock interview" }));
    for (let i = 0; i < 7; i++) await user.click(screen.getByRole("button", { name: "Next question" }));
    await user.click(screen.getByRole("button", { name: "Finish" }));

    const quoted = screen.getAllByRole("heading", { level: 2 }).filter((h) => /Pune|Hockey|Chess|Debate winner/.test(h.textContent ?? ""));
    expect(quoted).toHaveLength(3);
  });

  it("saves the run to the account: bank questions by key, PIQ questions with their wording", async () => {
    writePiq({ hometown: "Pune", sports: "Hockey", hobbies: "Chess", achievements: "Debate winner" });
    const user = userEvent.setup();
    renderMock();
    await user.click(screen.getByRole("button", { name: "Start mock interview" }));
    for (let i = 0; i < 7; i++) await user.click(screen.getByRole("button", { name: "Next question" }));
    await user.click(screen.getByRole("button", { name: "Finish" }));
    await waitFor(() => expect(actions.submit).toHaveBeenCalledTimes(1));
    const [slug, mode, key, answers] = actions.submit.mock.calls[0];
    expect([slug, mode]).toEqual(["interview", "mock"]);
    expect(String(key).length).toBeGreaterThanOrEqual(8);
    expect(answers).toHaveLength(8);
    expect(answers.filter((a: { key?: string }) => a.key).every((a: { key: string }) => a.key.startsWith("int-"))).toBe(true);
    expect(answers.filter((a: { key?: string; prompt?: string }) => !a.key && a.prompt)).toHaveLength(3);
    expect(await screen.findByText(/Saved to your account/)).toBeInTheDocument();
  });

  it("saves self-review ticks against the saved run", async () => {
    const user = userEvent.setup();
    renderMock("conference");
    await user.click(screen.getByRole("button", { name: "Start mock conference" }));
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole("button", { name: "Next question" }));
    await user.click(screen.getByRole("button", { name: "Finish" }));
    await screen.findByText(/Saved to your account/);
    await user.click(screen.getAllByRole("checkbox", { name: "Specific example" })[0]);
    await waitFor(() => expect(actions.review).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111", expect.any(Object)));
  });

  it("a failed save keeps the answers on screen with a retry", async () => {
    actions.submit.mockResolvedValueOnce({ ok: false, error: { code: "network_error", message: "We couldn't submit your practice. Please try again." } });
    const user = userEvent.setup();
    renderMock("conference");
    await user.click(screen.getByRole("button", { name: "Start mock conference" }));
    await user.type(screen.getByRole("textbox", { name: "Your response" }), "Composed answer");
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole("button", { name: "Next question" }));
    await user.click(screen.getByRole("button", { name: "Finish" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't submit");
    expect(screen.getByText("Composed answer")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry save" }));
    await waitFor(() => expect(actions.submit).toHaveBeenCalledTimes(2));
    expect(actions.submit.mock.calls[1][2]).toBe(actions.submit.mock.calls[0][2]); // same run key: no duplicate
  });

  it("offers the last saved run from the account", async () => {
    const user = userEvent.setup();
    renderMock("conference", { id: "x", completedAt: "2026-10-07T00:00:00Z", questions: [{ id: "conf-1", prompt: "Anything to add?" }], answers: { "conf-1": "Composed answer" }, selfReview: { "conf-1": ["Specific example"] } });
    await user.click(screen.getByRole("button", { name: "Review last attempt" }));
    expect(screen.getByText("Composed answer")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Specific example" })).toBeChecked();
  });
});
