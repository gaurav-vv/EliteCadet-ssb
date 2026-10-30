# Student CSV import and form feedback

## Importing students (Academy, Students, "Import students")

An academy admin uploads a CSV, sees every row checked, confirms, and the students are added in small
batches. Nothing is created until they press **Confirm and import**.

### File format

| Column | Required | Rule |
|---|---|---|
| `email` | yes | a valid email address (max 254 characters) |
| `full_name` | yes | 2 to 80 characters; can't start with `=`, `+`, `-` or `@` (spreadsheet formulas) |

These are exactly the fields of the Add student form; the model was not extended. Header names are
case-insensitive and `name` / `e-mail` style variants are accepted. Other columns are ignored (the dialog
lists them). The academy, role and every other value are never read from the file: they come from the
signed-in admin. The template (`email,full_name` only) is a header with no sample people, so it can't be
uploaded unchanged and email strangers.

Standard CSV is supported: header row, quoted values, commas and line breaks inside quotes, doubled quotes,
empty cells, UTF-8 (with or without a byte-order mark), CRLF or LF. A damaged file (an unclosed quote, a
quote in the middle of a value) is refused with a plain message instead of being guessed at.

Limits: `.csv` only, 256 KB, 500 students per file. Larger lists: split the file.

### What the preview shows

Row number, student, status and the exact issue. Statuses: **Valid**, **Invalid** (bad email, missing
field, name rule, too many columns, or an email that belongs to another academy / is not a student account),
**Duplicate** (same email as an earlier row), **Already a student** (already in your academy). Only valid rows
are imported; invalid and duplicate rows are listed, never silently skipped. The summary shows total, valid,
invalid and duplicate counts.

### How import works

Valid rows go to the server 10 at a time (a progress bar shows `n of N`). For each row the server:

1. requires an academy admin, and takes the academy from the session;
2. validates the row again (the preview is a convenience, not a decision);
3. skips anyone who already belongs to this academy;
4. otherwise uses the same code as the Add student form: an existing student account without an academy
   joins, everyone else gets an invitation email, so every student can sign in the normal way.

Because already-members are skipped, **retrying a file never creates a second account or sends a second
invite**, even if a response was lost halfway. If the email service reports a rate limit the import stops,
the remaining rows are reported as *not processed*, and uploading the same file again later finishes the job.

### The report

Imported, Failed, Skipped duplicates and Rows to correct, with the reason for each problem row, and
**Download rows to fix** (a CSV with `email`, `full_name`, `issue`, in the upload layout, so it can be
corrected and uploaded again). The dialog never says all rows were added when any failed.

### Security

- Only an academy admin can call the import; the academy is never taken from the browser or the file.
- Another academy's students are never touched or revealed (the lookup says only "belongs to another
  academy", as the Add student form already did); RLS still applies to every database read.
- The file is read in the browser and discarded; nothing is stored. Only `{row, email, fullName}` is sent.
- Requests are capped (10 rows to import, 50 to preview) so no request does unbounded work.
- No emails, names or passwords are logged. Spreadsheet formulas are neutralised in the downloaded file.

## Form feedback

- **Sign-up:** field-specific errors next to the field (name, academy name, email, password), the first
  invalid field gets focus, typed values are kept, the password rule ("At least 8 characters.") is shown, and
  a second click can't submit twice. After the account really exists: "Your account has been created
  successfully!" (on the next screen after a redirect, or on the "Confirm your email" card when email
  confirmation is on). Server refusals appear as they are (email already registered next to the email,
  a weak password next to the password, rate limits and other failures as a message).
- **Login:** field-specific errors, values kept, no double submit.
- **Add student:** "Student added successfully!" (with whether they joined or were invited), the list
  refreshes, the form resets only after success, and failures keep what was typed.

Server-side checks are unchanged and still enforce everything. One thing to know: sign-up goes from the
browser straight to Supabase Auth, so the password rule is enforced server-side only by the Auth setting
`minimum_password_length` (6 in `supabase/config.toml`, which is lower than the form's 8). Align the hosted
project's setting with the form if 8 must be a hard rule.
