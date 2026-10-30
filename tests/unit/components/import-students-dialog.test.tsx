import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImportStudentsDialog } from "@/components/academy/students/import-students-dialog";
import { importStudentsAction, previewStudentImportAction } from "@/lib/actions/academy-people";
import type { ImportResultRow } from "@/lib/server/academy-people/student-import";

vi.mock("@/lib/actions/academy-people", () => ({ importStudentsAction: vi.fn(), previewStudentImportAction: vi.fn() }));
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));

const importAction = vi.mocked(importStudentsAction);
const previewAction = vi.mocked(previewStudentImportAction);

// Every valid row is "new" unless a test says otherwise.
function previewAllNew() {
  previewAction.mockImplementation((async (rows: { row: number }[]) => ({ ok: true, data: { rows: rows.map((r) => ({ row: r.row, outcome: "new", message: "New student: an invitation email will be sent." })) } })) as never);
}
// Every sent row is added unless a test says otherwise.
const okRow = (r: { row: number; email: string; fullName: string }): ImportResultRow => ({ ...r, result: "invited", message: "Added; invitation email sent." });
function importAllOk() {
  importAction.mockImplementation((async (rows: { row: number; email: string; fullName: string }[]) => ({ ok: true, data: { rows: rows.map(okRow), stopped: null } })) as never);
}

const blobs: Blob[] = [];
beforeEach(() => {
  importAction.mockReset();
  previewAction.mockReset();
  refresh.mockReset();
  blobs.length = 0;
  URL.createObjectURL = vi.fn((b: Blob) => (blobs.push(b), "blob:test"));
  URL.revokeObjectURL = vi.fn();
  HTMLAnchorElement.prototype.click = vi.fn();
});

const readBlob = (blob: Blob) =>
  new Promise<string>((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.readAsText(blob);
  });

async function open(options: Parameters<typeof userEvent.setup>[0] = {}) {
  const user = userEvent.setup(options);
  render(<ImportStudentsDialog />);
  await user.click(screen.getByRole("button", { name: /import students/i }));
  return user;
}
async function upload(user: ReturnType<typeof userEvent.setup>, csv: string, name = "students.csv", type = "text/csv") {
  await user.upload(screen.getByLabelText(/choose a csv file/i), new File([csv], name, { type }));
}
const rows = (n: number) => Array.from({ length: n }, (_, i) => `s${i}@x.co,Student ${i}`).join("\n");

describe("choosing a file", () => {
  it("explains the columns and offers a header-only template", async () => {
    const user = await open();
    expect(screen.getByText(/required, the student's email address/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /download csv template/i }));
    expect(await readBlob(blobs[0])).toBe("email,full_name\r\n");
  });

  it.each([
    ["a non-CSV file", "students.xlsx", "a,b", "Choose a .csv file"],
    ["an empty file", "students.csv", "", "empty"],
    ["a file with missing headers", "students.csv", "email,phone\na@x.co,1", "missing: full_name"],
    ["a malformed file", "students.csv", 'email,full_name\n"a@x.co,Asha', "valid CSV"],
    ["a header with no students", "students.csv", "email,full_name\n", "no students"],
  ])("rejects %s with a clear message and shows no preview", async (_n, name, csv, expected) => {
    // The picker's accept filter is bypassed (a browser's "All files"), so the app's own check is what is tested.
    const user = await open({ applyAccept: false });
    await upload(user, csv, name, name.endsWith(".xlsx") ? "application/vnd.ms-excel" : "text/csv");
    expect(await screen.findByRole("alert")).toHaveTextContent(new RegExp(expected, "i"));
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(previewAction).not.toHaveBeenCalled();
  });

  it("rejects a file over the size limit", async () => {
    const user = await open();
    await upload(user, `email,full_name\n${"x".repeat(300 * 1024)}`);
    expect(await screen.findByRole("alert")).toHaveTextContent(/too large/i);
  });
});

describe("the validation report", () => {
  it("shows every row with its status and issue, and counts valid, invalid and duplicate rows", async () => {
    previewAllNew();
    const user = await open();
    await upload(user, "email,full_name\nrahul@x.co,Rahul Kumar\npriya@x,Priya Shah\naman@x.co,\nneha@x.co,Neha Rao\nRAHUL@x.co,Rahul Again");
    const table = await screen.findByRole("table");
    const body = within(table).getAllByRole("row").slice(1);
    expect(body).toHaveLength(5);
    expect(within(body[0]).getByText("Valid")).toBeInTheDocument();
    expect(within(body[1]).getByText("Invalid")).toBeInTheDocument();
    expect(within(body[1]).getByText(/Invalid email address/)).toBeInTheDocument();
    expect(within(body[2]).getByText(/Missing required field: full_name/)).toBeInTheDocument();
    expect(within(body[4]).getByText("Duplicate")).toBeInTheDocument();
    expect(within(body[4]).getByText(/Same email as row 2/)).toBeInTheDocument();
    const summary = screen.getByLabelText("Import summary");
    expect(within(summary).getByText("Total rows").nextSibling).toHaveTextContent("5");
    expect(within(summary).getByText("Valid rows").nextSibling).toHaveTextContent("2");
    expect(within(summary).getByText("Invalid rows").nextSibling).toHaveTextContent("2");
    expect(within(summary).getByText("Duplicate rows").nextSibling).toHaveTextContent("1");
    // Nothing is created by looking at the preview, and only valid rows are even checked against the server.
    expect(importAction).not.toHaveBeenCalled();
    expect(previewAction.mock.calls[0][0]).toEqual([
      { row: 2, email: "rahul@x.co", fullName: "Rahul Kumar" },
      { row: 5, email: "neha@x.co", fullName: "Neha Rao" },
    ]);
  });

  it("keeps people who are already members, or belong to another academy, out of the import", async () => {
    previewAction.mockResolvedValue({
      ok: true,
      data: { rows: [{ row: 2, outcome: "member", message: "Already a student of your academy; will be skipped." }, { row: 3, outcome: "blocked", message: "That student already belongs to another academy." }, { row: 4, outcome: "join", message: "Has an account: will join your academy." }] },
    } as never);
    const user = await open();
    await upload(user, "email,full_name\na@x.co,Asha\nb@x.co,Ben\nc@x.co,Chandra");
    expect(await screen.findByText("Already a student")).toBeInTheDocument();
    expect(screen.getByText(/another academy/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirm and import 1 student$/i })).toBeEnabled();
  });

  it("cannot import when no row is valid", async () => {
    const user = await open();
    await upload(user, "email,full_name\nbad,Asha");
    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirm and import 0 students/i })).toBeDisabled();
  });

  it("still lets the admin import when the server check fails, because every row is checked again there", async () => {
    previewAction.mockResolvedValue({ ok: false, error: { code: "unauthorized", message: "Only an academy admin can import students." } } as never);
    const user = await open();
    await upload(user, "email,full_name\na@x.co,Asha");
    expect(await screen.findByText(/Only an academy admin can import students/)).toBeInTheDocument();
  });
});

describe("importing", () => {
  it("asks for confirmation, sends only valid rows in small batches, then reports honestly", async () => {
    previewAllNew();
    importAllOk();
    const user = await open();
    await upload(user, `email,full_name\n${rows(25)}\nbad,Nope`);
    await user.click(await screen.findByRole("button", { name: /confirm and import 25 students/i }));
    // 25 were added, but the file also had an invalid row, so it is never reported as "all added".
    expect(await screen.findByText(/25 of 26 rows were added\. 1 needs attention\./)).toBeInTheDocument();
    expect(screen.queryByText(/^All /)).not.toBeInTheDocument();
    expect(within(screen.getByRole("dialog")).getByText(/Invalid email address/)).toBeInTheDocument();
    expect(importAction.mock.calls.map(([chunk]) => (chunk as unknown[]).length)).toEqual([10, 10, 5]);
    // The invalid row was never sent, and nothing but { row, email, fullName } is sent.
    const sent = importAction.mock.calls.flatMap(([chunk]) => chunk as { row: number }[]);
    expect(sent.some((r) => r.row === 27)).toBe(false);
    expect(Object.keys(sent[0]).sort()).toEqual(["email", "fullName", "row"]);
  });

  it("says all students were added only when every row was", async () => {
    previewAllNew();
    importAllOk();
    const user = await open();
    await upload(user, `email,full_name
${rows(3)}`);
    await user.click(await screen.findByRole("button", { name: /confirm and import 3 students/i }));
    expect(await screen.findByText(/All 3 valid students were added/)).toBeInTheDocument();
    expect(await screen.findByText(/3 students added successfully!/)).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
  });

  it("reports a partial failure honestly and offers the failed rows for correction", async () => {
    previewAllNew();
    importAction.mockImplementation((async (chunk: { row: number; email: string; fullName: string }[]) => ({
      ok: true,
      data: { stopped: null, rows: chunk.map((r) => (r.email === "bad@x.co" ? { ...r, result: "failed", message: "The email service rejected this address. Check it and try again." } : okRow(r))) },
    })) as never);
    const user = await open();
    await upload(user, "email,full_name\na@x.co,Asha Rao\nbad@x.co,Bad Address\nc@x.co,Chandra Das");
    await user.click(await screen.findByRole("button", { name: /confirm and import 3 students/i }));
    expect(await screen.findByText(/2 of 3 rows were added\. 1 needs attention\./)).toBeInTheDocument();
    expect(screen.queryByText(/All 3/)).not.toBeInTheDocument();
    expect(screen.getByText(/rejected this address/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /download rows to fix/i }));
    const csv = await readBlob(blobs[0]);
    expect(csv).toContain("email,full_name,issue");
    expect(csv).toContain("bad@x.co,Bad Address,");
    expect(csv).not.toContain("a@x.co");
    expect(refresh).toHaveBeenCalled();
  });

  it("stops at the email rate limit, never sends the remaining batches, and says what to do", async () => {
    previewAllNew();
    importAction.mockImplementationOnce((async (chunk: { row: number; email: string; fullName: string }[]) => ({
      ok: true,
      data: { stopped: "email_limit", rows: chunk.map((r, i) => (i < 3 ? okRow(r) : i === 3 ? { ...r, result: "failed", message: "The email service asked us to slow down, so this invitation wasn't sent." } : { ...r, result: "not_processed", message: "Not processed: the email service asked us to slow down." })) },
    })) as never);
    const user = await open();
    await upload(user, `email,full_name\n${rows(25)}`);
    await user.click(await screen.findByRole("button", { name: /confirm and import 25 students/i }));
    expect(await screen.findByText(/3 of 25 rows were added\. 22 need attention\./)).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/Upload the same file again in a few minutes/);
    expect(importAction).toHaveBeenCalledTimes(1);
  });

  it("does not claim success when the connection is lost mid-import", async () => {
    previewAllNew();
    importAction.mockRejectedValue(new Error("network"));
    const user = await open();
    await upload(user, "email,full_name\na@x.co,Asha Rao");
    await user.click(await screen.findByRole("button", { name: /confirm and import 1 student/i }));
    expect(await screen.findByText(/0 of 1 row was added\. 1 needs attention\./)).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/connection was lost.*skipped/i);
  });

  it("starts only one import when the confirm button is pressed twice", async () => {
    previewAllNew();
    let release!: (v: unknown) => void;
    importAction.mockImplementation((() => new Promise((r) => (release = r))) as never);
    const user = await open();
    await upload(user, "email,full_name\na@x.co,Asha Rao");
    const confirm = await screen.findByRole("button", { name: /confirm and import 1 student/i });
    await user.dblClick(confirm);
    await waitFor(() => expect(importAction).toHaveBeenCalled());
    expect(importAction).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    release({ ok: true, data: { stopped: null, rows: [okRow({ row: 2, email: "a@x.co", fullName: "Asha Rao" })] } });
    expect(await screen.findByText(/All 1 valid student was added/)).toBeInTheDocument();
    expect(importAction).toHaveBeenCalledTimes(1);
  });

  it("shows a server refusal as not processed instead of success", async () => {
    previewAllNew();
    importAction.mockResolvedValue({ ok: false, error: { code: "unauthorized", message: "Only an academy admin can import students." } } as never);
    const user = await open();
    await upload(user, "email,full_name\na@x.co,Asha Rao");
    await user.click(await screen.findByRole("button", { name: /confirm and import 1 student/i }));
    expect(await screen.findByText(/0 of 1 row was added/)).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/Only an academy admin/);
  });
});
