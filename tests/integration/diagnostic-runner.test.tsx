import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const h = vi.hoisted(() => ({ submit: vi.fn(), push: vi.fn() }));
vi.mock("@/lib/actions/student", () => ({ submitDiagnosticAction: h.submit }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: h.push, refresh: vi.fn() }) }));

import { DiagnosticRunner } from "@/components/diagnostic/diagnostic-runner";

const items = [
  { key: "dk-1", section: "knowledge" as const, prompt: "What does SSB stand for?", options: [{ id: "dk-1-a", label: "Services Selection Board" }, { id: "dk-1-b", label: "Staff Selection Board" }] },
  { key: "dw-sit-1", section: "situational_reasoning" as const, prompt: "A teammate twists an ankle. What do you do?", options: null },
];

beforeEach(() => {
  h.submit.mockReset().mockResolvedValue({ ok: true, data: { id: "d1" } });
  h.push.mockReset();
});

describe("DiagnosticRunner", () => {
  it("lets the student skip, never marks answers while taking it, and submits everything at the end", async () => {
    render(<DiagnosticRunner items={items} />);
    expect(screen.getByRole("button", { name: "Skip" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: "Services Selection Board" }));
    expect(screen.queryByText(/correct/i)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Your answer" }), "Give first aid and call for help.");
    await userEvent.click(screen.getByRole("button", { name: "Finish" }));
    expect(h.submit).toHaveBeenCalledWith([{ key: "dk-1", optionId: "dk-1-a" }, { key: "dw-sit-1", response: "Give first aid and call for help." }]);
    expect(h.push).toHaveBeenCalledWith("/student/diagnostic/d1");
  });

  it("keeps the answers when saving fails", async () => {
    h.submit.mockResolvedValueOnce({ ok: false, error: { code: "network_error", message: "We couldn't save your diagnostic. Your answers are still here — please try again." } });
    render(<DiagnosticRunner items={items.slice(1)} />);
    await userEvent.type(screen.getByRole("textbox", { name: "Your answer" }), "Keep me");
    await userEvent.click(screen.getByRole("button", { name: "Finish" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("still here");
    expect(screen.getByRole("textbox", { name: "Your answer" })).toHaveValue("Keep me");
  });
});
