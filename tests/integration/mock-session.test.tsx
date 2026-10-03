// Integration: MockSession wired to the real CarouselRunner, countdown hook,
// question picker, PIQ store and attempt store (specs.md §6.4b).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MockSession } from "@/components/practice/mock-session";
import { writePiq } from "@/lib/student/piq-storage";

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

function renderMock(kind: "interview" | "conference" = "interview") {
  return render(
    <MockSession
      kind={kind}
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

  it("keeps the last attempt and its self-review after a reload", async () => {
    const user = userEvent.setup();
    const { unmount } = renderMock("conference");
    await user.click(screen.getByRole("button", { name: "Start mock conference" }));
    await user.type(screen.getByRole("textbox", { name: "Your response" }), "Composed answer");
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole("button", { name: "Next question" }));
    await user.click(screen.getByRole("button", { name: "Finish" }));
    await user.click(screen.getAllByRole("checkbox", { name: "Specific example" })[0]);
    unmount();

    renderMock("conference");
    await user.click(await screen.findByRole("button", { name: "Review last attempt" }));
    expect(screen.getByText("Composed answer")).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox", { name: "Specific example" })[0]).toBeChecked();
  });
});
