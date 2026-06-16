import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data', 'health.db');

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    full_name TEXT,
    date_of_birth TEXT,
    sex TEXT,
    blood_type TEXT,
    height_cm REAL,
    weight_kg REAL,
    notes TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS conditions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    diagnosed_date TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS medications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    dosage TEXT,
    frequency TEXT,
    prescribing_doctor TEXT,
    start_date TEXT,
    end_date TEXT,
    is_active INTEGER DEFAULT 1,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS allergies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    allergen TEXT NOT NULL,
    reaction TEXT,
    severity TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS immunizations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vaccine TEXT NOT NULL,
    date_given TEXT,
    provider TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS labs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_name TEXT NOT NULL,
    test_date TEXT,
    result_value TEXT,
    unit TEXT,
    reference_range TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visit_date TEXT NOT NULL,
    provider TEXT,
    reason TEXT,
    summary TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    relationship TEXT,
    role TEXT,
    phone TEXT,
    email TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT,
    file_name TEXT NOT NULL,
    stored_name TEXT NOT NULL,
    mime_type TEXT,
    size_bytes INTEGER,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

export function getProfile() {
  return db.prepare('SELECT * FROM profile WHERE id = 1').get() || null;
}

export function upsertProfile(fields) {
  const existing = getProfile();
  const data = {
    full_name: fields.full_name ?? existing?.full_name ?? null,
    date_of_birth: fields.date_of_birth ?? existing?.date_of_birth ?? null,
    sex: fields.sex ?? existing?.sex ?? null,
    blood_type: fields.blood_type ?? existing?.blood_type ?? null,
    height_cm: fields.height_cm ?? existing?.height_cm ?? null,
    weight_kg: fields.weight_kg ?? existing?.weight_kg ?? null,
    notes: fields.notes ?? existing?.notes ?? null,
  };
  db.prepare(`
    INSERT INTO profile (id, full_name, date_of_birth, sex, blood_type, height_cm, weight_kg, notes, updated_at)
    VALUES (1, @full_name, @date_of_birth, @sex, @blood_type, @height_cm, @weight_kg, @notes, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      full_name = @full_name,
      date_of_birth = @date_of_birth,
      sex = @sex,
      blood_type = @blood_type,
      height_cm = @height_cm,
      weight_kg = @weight_kg,
      notes = @notes,
      updated_at = datetime('now')
  `).run(data);
  return getProfile();
}
