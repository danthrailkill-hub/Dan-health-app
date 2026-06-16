# Dan Health App

A private, single-user web app for keeping your own medical information in one place: profile/vitals, conditions, medications, allergies, immunizations, lab results, doctor visits, emergency/care contacts, and uploaded documents (PDFs, images, scans).

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

## Data

- The SQLite database lives at `server/data/health.db` (created automatically on first run).
- Uploaded documents are stored as files in `server/uploads/`, with metadata in the database.
- Back up `server/data/` and `server/uploads/` together if you want to keep your records.

## Security notes

- This app is meant to be run privately (e.g. on your own machine or a server only you can reach). It uses a single shared password, not per-user accounts.
- Set a strong, unique `JWT_SECRET` and `APP_PASSWORD` in `server/.env` — never commit that file.
- If you expose this beyond `localhost`, put it behind HTTPS.
