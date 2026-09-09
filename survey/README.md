# Ernst Concrete Engagement Survey

A web app for running an employee engagement survey: upload the active employee
roster, let employees authenticate with just their Employee ID, and collect
survey responses linked to that employee's demographic data.

## Structure

- `server/` — Express API + SQLite (`better-sqlite3`).
- `client/` — React (Vite) single-page app.

## How it works

1. **Admin** logs in with a shared admin password and uploads a CSV of active
   employees (Employee ID, name, department, location, supervisor, etc.).
2. **Admin** creates a survey and adds questions (ratings, single/multiple
   choice, or open text) — one at a time, pasted in bulk, or imported from a
   CSV export — then marks the survey **Open**. Questions can carry a
   **section** (where they appear as employees take the survey) and a
   **category/factor** (how they're grouped in the results dashboard).
3. **Employee** visits the site and enters only their Employee ID. The server
   checks it against the uploaded roster and confirms the employee is active
   before letting them into the open survey.
4. **Employee** answers the questions and submits. Each employee can submit
   once per survey; responses are stored linked to the employee's ID so
   results can be filtered/exported by department, location, etc.
5. **Admin** reviews per-question breakdowns and exports a CSV of all
   responses joined with employee demographics.

## Setup

### 1. Server

```bash
cd server
cp .env.example .env
# edit .env: set JWT_SECRET (any long random string) and ADMIN_PASSWORD
npm install
npm start
```

The API listens on `http://localhost:4100` by default.

### 2. Client

```bash
cd client
cp .env.example .env   # defaults to http://localhost:4100, change if needed
npm install
npm run dev
```

Open `http://localhost:5174` for the employee-facing survey, and
`http://localhost:5174/admin/login` for the admin dashboard.

## Uploading the employee roster

Admin → Employee Roster → Upload roster. The CSV can use these headers (case
and punctuation are flexible, so common variants like "Employee ID" or
"EmployeeID" also work):

```
Last Name, First Name, Employee Id, Birth Date, Hire Date,
Supervisor's Employee ID, Supervisor's Name (Last, First), Position Job Title,
Department, Company Code, Company Name, Work Location Name, Gender,
Legal Ethnicity/Race Description, Pay Type, Active
```

Only `Employee Id` is required; every other column is optional. An optional
`Active`/`Status` column can mark someone inactive (`inactive`, `terminated`,
`no`, `0`, etc.) — anyone missing from the column defaults to active.

- **Replace** (recommended for routine updates): clears the roster and loads
  the uploaded file as the new full active list, so anyone no longer in the
  export can't authenticate.
- **Merge**: adds/updates rows by Employee ID without removing existing ones.

A blank template is available from the same page (Download CSV Template).

## Importing questions from a file

Survey editor → Import from file. Accepts a **CSV** export with these headers
(case/punctuation flexible): `Section`, `Factor` (or `Category`), `Question`,
`Question Type`, `Select Options`. This matches the question-bank export
format used by engagement-survey platforms like Culture Amp, so you can drop
one in directly.

- Question types: `rating` → 1-5 rating, `free_text` → open text, `select` →
  single choice (needs a populated `Select Options` column). `demographic`
  rows are skipped — that data comes from the employee roster instead.
- Only `.csv` is accepted. If your export is an Excel workbook, open it and
  use File → Save As → CSV first — the `xlsx` npm package used to parse
  Excel files server-side carries unpatched high-severity vulnerabilities
  (prototype pollution, ReDoS), so this app doesn't parse `.xlsx` directly.

## Data

- The SQLite database lives at `server/data/survey.db` (created automatically
  on first run).

## Security notes

- Employee authentication is by Employee ID only (no password), by design —
  it's a low-friction way to confirm someone is on the active roster. The
  login endpoint is rate-limited to slow down ID-guessing.
- The admin area uses a single shared password (like the personal health app
  in this repo). Set a strong, unique `JWT_SECRET` and `ADMIN_PASSWORD` in
  `server/.env` — never commit that file.
- Survey responses are stored linked to the submitting employee's ID (not
  anonymized) so results can be filtered by department/location/etc.
- If you expose this beyond `localhost`, put it behind HTTPS.
