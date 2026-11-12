# Dan Health App

A private, single-user web app for keeping your own medical information in one place: profile/vitals, conditions, medications, allergies, immunizations, lab results, doctor visits, emergency/care contacts, and uploaded documents (PDFs, images, scans).

It also includes a **Type 1 diabetes module** (in the spirit of Glooko / Dexcom Clarity): CGM, insulin, carb and event tracking with time-in-range, an AGP glucose profile, a daily timeline, automated pattern insights, CSV import from Dexcom and Libre, and Nightscout sync.

All data is stored locally in a SQLite file on the server you run — nothing is sent to a third party.

## Structure

- `server/` — Express API + SQLite (`better-sqlite3`). Single-user password auth via an httpOnly session cookie.
- `client/` — React (Vite) single-page app.

## Setup

### 1. Server

```bash
cd server
cp .env.example .env
# edit .env: set JWT_SECRET (any long random string) and APP_PASSWORD (your password)
npm install
npm start
```

The API listens on `http://localhost:4000` by default.

### 2. Client

```bash
cd client
cp .env.example .env   # defaults to http://localhost:4000, change if needed
npm install
npm run dev
```

Open `http://localhost:5173` and log in with the `APP_PASSWORD` you set.

## Type 1 Diabetes module

Find it under **Type 1 Diabetes** in the sidebar. To try it right away, open **Overview** and click **Load 14 days of demo data** (remove it later from **Import & Sync → Your data sources**).

| Screen | What it does |
| --- | --- |
| Overview | Time in range (very low / low / in range / high / very high), average glucose, GMI (estimated A1c), CV, lows, AGP glucose profile, time-of-day table, insulin and carb averages, day-by-day table, automated insights. **Print report** gives a printable summary for appointments. |
| Daily view | One day on a timeline: CGM line, fingersticks, boluses, basal, carbs and events (exercise, site/sensor changes). Hover for details. |
| Logbook | Quick entry for fingersticks, insulin, carbs and events, plus a list of recent entries. |
| Import & Sync | Upload CSV exports from Dexcom Clarity or LibreView, or the generic template; sync from Nightscout; export your data as CSV; delete everything from one source to undo an import. |
| Diabetes Settings | mg/dL or mmol/L, your target-range thresholds, timezone, Nightscout URL and token. |

**Getting your data in**

- **Dexcom:** clarity.dexcom.com → Export → choose a date range → upload the CSV.
- **FreeStyle Libre:** libreview.com → Glucose History → Download glucose data → upload the CSV.
- **Nightscout** (works for Dexcom Share, Libre via xDrip+/Juggluco, Omnipod 5, Loop, AndroidAPS, Tandem): add the site URL and a read-only token in Diabetes Settings, then **Sync now**.
- **Anything else:** fill in the CSV template (download link on the Import page). The app's own export uses the same format.

Re-importing the same data is safe; duplicates (same timestamp) are skipped.

**How it works / where to change things**

- `server/src/diabetes/stats.js`: every metric and insight (time in range, GMI, CV, lows, AGP percentiles, post-meal rises, rebound highs, lows after exercise, ...). Add a new insight in `buildInsights()`.
- `server/src/diabetes/importers.js`: CSV parsers. To support another device, write an importer that returns `{ glucose, insulin, carbs, events }` and register it in `IMPORTERS`.
- `server/src/diabetes/nightscout.js`: Nightscout sync. `server/src/diabetes/demo.js`: demo data generator.
- `server/src/diabetes/schema.js`: tables (`glucose_readings`, `insulin_doses`, `carb_entries`, `dm_events`, `dm_settings`). Glucose is always stored in mg/dL; timestamps are local wall-clock time (`YYYY-MM-DDTHH:MM:SS`).
- `client/src/pages/diabetes/*` and `client/src/components/diabetes/*`: the screens and charts (plain SVG, no chart library).
- `cd server && npm test` runs the importer and stats tests.

Metrics follow the International Consensus on Time in Range (Battelino et al., 2019). This is a personal tracking tool, not a medical device: insights are pattern observations to discuss with your care team, and the app never suggests insulin doses.

## Data

- The SQLite database lives at `server/data/health.db` (created automatically on first run).
- Uploaded documents are stored as files in `server/uploads/`, with metadata in the database.
- Back up `server/data/` and `server/uploads/` together if you want to keep your records.

## Security notes

- This app is meant to be run privately (e.g. on your own machine or a server only you can reach). It uses a single shared password, not per-user accounts.
- Set a strong, unique `JWT_SECRET` and `APP_PASSWORD` in `server/.env` — never commit that file.
- If you expose this beyond `localhost`, put it behind HTTPS.
