"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileUp, Upload } from "lucide-react";
import { Toast } from "@/components/academy/shared/toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatusTag } from "@/components/ui/status-tag";
import { importStudentsAction, previewStudentImportAction } from "@/lib/actions/academy-people";
import { toCsv } from "@/lib/csv/parse-csv";
import {
  checkImportFile,
  IMPORT_CHUNK_SIZE,
  IMPORT_MAX_FILE_BYTES,
  IMPORT_MAX_ROWS,
  IMPORT_PREVIEW_CHUNK_SIZE,
  parseStudentCsv,
  STUDENT_CSV_COLUMNS,
  STUDENT_CSV_TEMPLATE,
  validateImportRows,
  type ImportResultRow,
  type ImportRowCheck,
  type PreviewRow,
} from "@/lib/server/academy-people/student-import";

type Step = "choose" | "preview" | "importing" | "report";
type Tone = "success" | "warning" | "danger" | "neutral";

interface Entry {
  check: ImportRowCheck;
  outcome?: PreviewRow;
  /** Will be sent to the server on confirm. */
  sendable: boolean;
  label: string;
  tone: Tone;
  issue: string;
}

const TOAST_MS = 7000;

function describe(check: ImportRowCheck, outcome?: PreviewRow): Entry {
  if (check.status === "invalid") return { check, sendable: false, label: "Invalid", tone: "danger", issue: check.issues.join(" ") };
  if (check.status === "duplicate") return { check, sendable: false, label: "Duplicate", tone: "warning", issue: check.issues.join(" ") };
  if (outcome?.outcome === "blocked") return { check, outcome, sendable: false, label: "Invalid", tone: "danger", issue: outcome.message };
  if (outcome?.outcome === "member") return { check, outcome, sendable: false, label: "Already a student", tone: "warning", issue: outcome.message };
  return { check, outcome, sendable: true, label: "Valid", tone: "success", issue: outcome?.message ?? "Ready to import." };
}

function readText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, "utf-8");
  });
}

function download(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Bulk add: upload a CSV (email, full_name), see every row checked, confirm, then watch it import in small
// batches. Each row is checked again on the server, and the academy is always the signed-in admin's.
export function ImportStudentsDialog({ variant = "outline" }: { variant?: "outline" | "inline" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("choose");
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [ignored, setIgnored] = useState<string[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [checking, setChecking] = useState(false);
  const [previewNote, setPreviewNote] = useState<string | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<ImportResultRow[]>([]);
  const [stopMessage, setStopMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const running = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const importing = step === "importing";

  function reset() {
    setStep("choose");
    setFileName("");
    setFileError(null);
    setIgnored([]);
    setEntries([]);
    setChecking(false);
    setPreviewNote(null);
    setProgress({ done: 0, total: 0 });
    setResults([]);
    setStopMessage(null);
    if (input.current) input.current.value = "";
  }

  function showToast(message: string, tone: "success" | "error") {
    setToast({ message, tone });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setFileError(null);
    const allowed = checkImportFile(file);
    if (!allowed.ok) return setFileError(allowed.message);
    let text: string;
    try {
      text = await readText(file);
    } catch {
      return setFileError("We couldn't read that file. Try saving it again as a CSV.");
    }
    const parsed = parseStudentCsv(text);
    if (!parsed.ok) return setFileError(parsed.message);

    const checks = validateImportRows(parsed.rows);
    setFileName(file.name);
    setIgnored(parsed.ignoredColumns);
    setEntries(checks.map((c) => describe(c)));
    setPreviewNote(null);
    setStep("preview");

    // Ask the server what each valid row would become (new / joins / already a member / blocked).
    const toCheck = checks.filter((c) => c.status === "valid");
    if (toCheck.length === 0) return;
    setChecking(true);
    const outcomes = new Map<number, PreviewRow>();
    let note: string | null = null;
    for (let i = 0; i < toCheck.length; i += IMPORT_PREVIEW_CHUNK_SIZE) {
      try {
        const res = await previewStudentImportAction(toCheck.slice(i, i + IMPORT_PREVIEW_CHUNK_SIZE).map((c) => ({ row: c.row, email: c.email, fullName: c.fullName })));
        if (!res.ok || !res.data) {
          note = res.error?.message ?? "We couldn't check these rows against your academy.";
          break;
        }
        for (const o of res.data.rows) outcomes.set(o.row, o);
      } catch {
        note = "We couldn't reach the server to check these rows. You can still import; every row is checked again then.";
        break;
      }
    }
    setEntries(checks.map((c) => describe(c, outcomes.get(c.row))));
    setPreviewNote(note);
    setChecking(false);
  }

  const sendable = entries.filter((e) => e.sendable);
  const counts = {
    total: entries.length,
    valid: sendable.length,
    invalid: entries.filter((e) => e.label === "Invalid").length,
    duplicate: entries.filter((e) => e.label === "Duplicate" || e.label === "Already a student").length,
  };

  async function confirmImport() {
    if (running.current || sendable.length === 0) return; // a double click must not start two imports
    running.current = true;
    setStep("importing");
    setStopMessage(null);
    const rows = sendable.map((e) => ({ row: e.check.row, email: e.check.email, fullName: e.check.fullName }));
    setProgress({ done: 0, total: rows.length });
    const collected: ImportResultRow[] = [];
    let message: string | null = null;
    const notProcessed = (chunk: typeof rows, why: string): ImportResultRow[] => chunk.map((r) => ({ row: r.row, email: r.email, fullName: r.fullName, result: "not_processed", message: why }));

    for (let i = 0; i < rows.length; i += IMPORT_CHUNK_SIZE) {
      const chunk = rows.slice(i, i + IMPORT_CHUNK_SIZE);
      try {
        const res = await importStudentsAction(chunk);
        if (!res.ok || !res.data) {
          message = res.error?.message ?? "The import was interrupted.";
          collected.push(...notProcessed(chunk, `Not processed: ${message}`));
          collected.push(...notProcessed(rows.slice(i + IMPORT_CHUNK_SIZE), "Not processed: the import stopped before this row."));
          break;
        }
        collected.push(...res.data.rows);
        setProgress({ done: Math.min(i + chunk.length, rows.length), total: rows.length });
        if (res.data.stopped) {
          message = res.data.stopped === "email_limit" ? "The email service asked us to slow down, so the import stopped early. Upload the same file again in a few minutes: students already added are skipped." : "Invitations aren't set up on this server, so the import stopped.";
          collected.push(...notProcessed(rows.slice(i + IMPORT_CHUNK_SIZE), "Not processed: the import stopped before this row."));
          break;
        }
      } catch {
        message = "The connection was lost. Some of these students may already have been added; upload the same file again and those are skipped.";
        collected.push(...notProcessed(chunk, "Not processed: the connection was lost."));
        collected.push(...notProcessed(rows.slice(i + IMPORT_CHUNK_SIZE), "Not processed: the import stopped before this row."));
        break;
      }
    }

    setResults(collected);
    setStopMessage(message);
    setStep("report");
    running.current = false;
    router.refresh();

    const added = collected.filter((r) => r.result === "invited" || r.result === "joined").length;
    const problems = collected.filter((r) => r.result === "failed" || r.result === "not_processed").length + entries.filter((e) => !e.sendable && e.label === "Invalid").length;
    if (problems === 0 && !message) showToast(`${added} ${added === 1 ? "student" : "students"} added successfully!`, "success");
    else showToast(`Import finished with problems: ${added} added, ${problems} need attention.`, "error");
  }

  // Everything that was not added and needs a person to look at it, in the original column layout so the
  // file can be corrected and uploaded again.
  function problemRows(): { row: number; email: string; fullName: string; status: string; issue: string }[] {
    const fromServer = results.filter((r) => r.result === "failed" || r.result === "not_processed").map((r) => ({ row: r.row, email: r.email, fullName: r.fullName, status: r.result === "failed" ? "Failed" : "Not processed", issue: r.message }));
    const beforeImport = entries.filter((e) => e.label === "Invalid").map((e) => ({ row: e.check.row, email: e.check.email, fullName: e.check.fullName, status: "Invalid", issue: e.issue }));
    return [...beforeImport, ...fromServer].sort((a, b) => a.row - b.row);
  }

  const added = results.filter((r) => r.result === "invited" || r.result === "joined");
  const skipped = results.filter((r) => r.result === "skipped").length + entries.filter((e) => e.label === "Duplicate" || e.label === "Already a student").length;
  const failedOnServer = results.filter((r) => r.result === "failed").length;
  const problems = problemRows();

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (importing) return; // never close in the middle of an import
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogTrigger asChild>
          <Button type="button" variant="outline" className="h-11 gap-1.5 rounded-button">
            <Upload aria-hidden="true" />
            {variant === "outline" ? "Import students" : "Import from CSV"}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Import students</DialogTitle>
            <DialogDescription>Add many students at once from a CSV file. New people get an invitation email; people who already have a student account without an academy join yours.</DialogDescription>
          </DialogHeader>

          {step === "choose" && (
            <div className="flex flex-col gap-4">
              <div className="rounded-card border border-hairline p-4 text-[13px] text-ink-secondary">
                <p className="font-medium text-ink">Columns (header row required)</p>
                <ul className="mt-1 list-disc pl-5">
                  <li>
                    <code>{STUDENT_CSV_COLUMNS[0]}</code>: required, the student&apos;s email address
                  </li>
                  <li>
                    <code>{STUDENT_CSV_COLUMNS[1]}</code>: required, 2 to 80 characters
                  </li>
                </ul>
                <p className="mt-2">
                  Up to {IMPORT_MAX_ROWS} students and {IMPORT_MAX_FILE_BYTES / 1024} KB per file. Put quotes around any value that contains a comma. Other columns are ignored; your academy is always the one you&apos;re signed in to.
                </p>
                <Button type="button" variant="outline" size="sm" className="mt-3 gap-1.5" onClick={() => download("student-import-template.csv", STUDENT_CSV_TEMPLATE)}>
                  <Download aria-hidden="true" />
                  Download CSV template
                </Button>
              </div>

              {fileError && (
                <Alert variant="destructive" role="alert">
                  <AlertDescription>{fileError}</AlertDescription>
                </Alert>
              )}

              <label htmlFor="student-csv" className="flex cursor-pointer flex-col items-center gap-2 rounded-card border border-dashed border-hairline px-4 py-8 text-center hover:bg-black/[0.02]">
                <FileUp aria-hidden="true" className="text-ink-secondary" />
                <span className="text-[14px] font-medium text-ink">Choose a CSV file</span>
                <span className="text-[12px] text-ink-secondary">.csv, UTF-8</span>
                <input id="student-csv" ref={input} type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => void handleFile(e.target.files?.[0])} />
              </label>
            </div>
          )}

          {step === "preview" && (
            <div className="flex flex-col gap-4">
              <p className="text-[13px] text-ink-secondary">
                Checking <span className="font-medium text-ink">{fileName}</span>. Nothing has been added yet.
              </p>
              {ignored.length > 0 && (
                <Alert role="status">
                  <AlertDescription>Ignored columns: {ignored.join(", ")}.</AlertDescription>
                </Alert>
              )}
              {previewNote && (
                <Alert role="status">
                  <AlertDescription>{previewNote}</AlertDescription>
                </Alert>
              )}
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Import summary">
                {[
                  ["Total rows", counts.total],
                  ["Valid rows", counts.valid],
                  ["Invalid rows", counts.invalid],
                  ["Duplicate rows", counts.duplicate],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-card border border-hairline p-3">
                    <dt className="text-[12px] text-ink-secondary">{label}</dt>
                    <dd className="text-[20px] font-semibold text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
              {checking && (
                <p role="status" className="text-[13px] text-ink-secondary">
                  Checking rows against your academy…
                </p>
              )}
              <div className="max-h-72 overflow-auto rounded-card border border-hairline">
                <table className="w-full text-left text-[13px]">
                  <thead className="sticky top-0 bg-white text-ink-secondary">
                    <tr>
                      <th scope="col" className="px-3 py-2 font-medium">Row</th>
                      <th scope="col" className="px-3 py-2 font-medium">Student</th>
                      <th scope="col" className="px-3 py-2 font-medium">Status</th>
                      <th scope="col" className="px-3 py-2 font-medium">Issue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e) => (
                      <tr key={e.check.row} className="border-t border-hairline align-top">
                        <td className="px-3 py-2 tabular-nums">{e.check.row}</td>
                        <td className="px-3 py-2">
                          <span className="block font-medium text-ink">{e.check.fullName || "(no name)"}</span>
                          <span className="block text-ink-secondary">{e.check.email || "(no email)"}</span>
                        </td>
                        <td className="px-3 py-2">
                          <StatusTag label={e.label} tone={e.tone} />
                        </td>
                        <td className="px-3 py-2 text-ink-secondary">{e.issue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[13px] text-ink">
                {counts.valid === 0 ? "No row can be imported. Fix the file and upload it again." : `Only the ${counts.valid} valid ${counts.valid === 1 ? "row" : "rows"} will be imported. Invalid and duplicate rows are not imported; nothing is skipped silently.`}
              </p>
              <DialogFooter className="gap-2 sm:gap-2">
                <Button type="button" variant="outline" className="h-11 rounded-button" onClick={reset}>
                  Choose another file
                </Button>
                <Button type="button" className="h-11 rounded-button" disabled={checking || counts.valid === 0} onClick={() => void confirmImport()}>
                  Confirm and import {counts.valid} {counts.valid === 1 ? "student" : "students"}
                </Button>
              </DialogFooter>
            </div>
          )}

          {step === "importing" && (
            <div className="flex flex-col gap-3 py-4" role="status" aria-live="polite">
              <p className="text-[14px] text-ink">
                Importing… {progress.done} of {progress.total}
              </p>
              <div role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done} aria-label="Import progress" className="h-2 overflow-hidden rounded-full bg-black/10">
                <div className="h-full bg-brand-accent transition-[width]" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
              </div>
              <p className="text-[12px] text-ink-secondary">Keep this window open. Each student is added one batch at a time.</p>
            </div>
          )}

          {step === "report" && (
            <div className="flex flex-col gap-4">
              <p role="status" className="text-[15px] font-medium text-ink">
                {problems.length === 0 && !stopMessage ? `All ${added.length} valid ${added.length === 1 ? "student was" : "students were"} added.` : `${added.length} of ${counts.total} ${counts.total === 1 ? "row was" : "rows were"} added. ${problems.length} need${problems.length === 1 ? "s" : ""} attention.`}
              </p>
              {stopMessage && (
                <Alert variant="destructive" role="alert">
                  <AlertDescription>{stopMessage}</AlertDescription>
                </Alert>
              )}
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Import report">
                {[
                  ["Imported", added.length],
                  ["Failed", failedOnServer],
                  ["Skipped duplicates", skipped],
                  ["Rows to correct", problems.length],
                ].map(([label, value]) => (
                  <div key={label as string} className="rounded-card border border-hairline p-3">
                    <dt className="text-[12px] text-ink-secondary">{label}</dt>
                    <dd className="text-[20px] font-semibold text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
              {problems.length > 0 && (
                <>
                  <div className="max-h-60 overflow-auto rounded-card border border-hairline">
                    <table className="w-full text-left text-[13px]">
                      <thead className="sticky top-0 bg-white text-ink-secondary">
                        <tr>
                          <th scope="col" className="px-3 py-2 font-medium">Row</th>
                          <th scope="col" className="px-3 py-2 font-medium">Student</th>
                          <th scope="col" className="px-3 py-2 font-medium">Status</th>
                          <th scope="col" className="px-3 py-2 font-medium">Issue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {problems.map((p) => (
                          <tr key={`${p.row}-${p.status}`} className="border-t border-hairline align-top">
                            <td className="px-3 py-2 tabular-nums">{p.row}</td>
                            <td className="px-3 py-2">
                              <span className="block font-medium text-ink">{p.fullName || "(no name)"}</span>
                              <span className="block text-ink-secondary">{p.email || "(no email)"}</span>
                            </td>
                            <td className="px-3 py-2">
                              <StatusTag label={p.status} tone="danger" />
                            </td>
                            <td className="px-3 py-2 text-ink-secondary">{p.issue}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <Button type="button" variant="outline" className="gap-1.5" onClick={() => download("students-to-fix.csv", toCsv([["email", "full_name", "issue"], ...problems.map((p) => [p.email, p.fullName, p.issue])]))}>
                      <Download aria-hidden="true" />
                      Download rows to fix
                    </Button>
                    <p className="mt-1 text-[12px] text-ink-secondary">Correct these rows and upload the file again. Students already added are skipped.</p>
                  </div>
                </>
              )}
              <DialogFooter className="gap-2 sm:gap-2">
                <Button type="button" variant="outline" className="h-11 rounded-button" onClick={reset}>
                  Import another file
                </Button>
                <Button type="button" className="h-11 rounded-button" onClick={() => setOpen(false)}>
                  Done
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {toast && <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
    </>
  );
}
