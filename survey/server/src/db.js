import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data', 'survey.db');

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS employees (
    employee_id TEXT PRIMARY KEY,
    last_name TEXT,
    first_name TEXT,
    birth_date TEXT,
    hire_date TEXT,
    supervisor_employee_id TEXT,
    supervisor_name TEXT,
    job_title TEXT,
    department TEXT,
    company_code TEXT,
    company_name TEXT,
    work_location_name TEXT,
    gender TEXT,
    ethnicity_race TEXT,
    pay_type TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    uploaded_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS surveys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    prompt TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'likert5' CHECK (type IN ('likert5', 'single_choice', 'multi_choice', 'text')),
    options TEXT,
    required INTEGER NOT NULL DEFAULT 1,
    section TEXT,
    category TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL,
    submitted_at TEXT DEFAULT (datetime('now')),
    UNIQUE(survey_id, employee_id)
  );

  CREATE TABLE IF NOT EXISTS answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    response_id INTEGER NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    value TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_questions_survey ON questions(survey_id);
  CREATE INDEX IF NOT EXISTS idx_responses_survey ON responses(survey_id);
  CREATE INDEX IF NOT EXISTS idx_answers_response ON answers(response_id);
`);

// Migration: add section/category to questions if this DB predates them.
const questionColumns = db.prepare("PRAGMA table_info(questions)").all().map((c) => c.name);
if (!questionColumns.includes('section')) db.exec('ALTER TABLE questions ADD COLUMN section TEXT');
if (!questionColumns.includes('category')) db.exec('ALTER TABLE questions ADD COLUMN category TEXT');

// --- Employees ---

const EMPLOYEE_COLUMNS = [
  'employee_id', 'last_name', 'first_name', 'birth_date', 'hire_date',
  'supervisor_employee_id', 'supervisor_name', 'job_title', 'department',
  'company_code', 'company_name', 'work_location_name', 'gender',
  'ethnicity_race', 'pay_type', 'active',
];

export function replaceEmployees(rows) {
  const insert = db.prepare(`
    INSERT INTO employees (${EMPLOYEE_COLUMNS.join(', ')})
    VALUES (${EMPLOYEE_COLUMNS.map((c) => '@' + c).join(', ')})
  `);
  const tx = db.transaction((records) => {
    db.prepare('DELETE FROM employees').run();
    for (const r of records) insert.run(r);
  });
  tx(rows);
}

export function upsertEmployees(rows) {
  const insert = db.prepare(`
    INSERT INTO employees (${EMPLOYEE_COLUMNS.join(', ')})
    VALUES (${EMPLOYEE_COLUMNS.map((c) => '@' + c).join(', ')})
    ON CONFLICT(employee_id) DO UPDATE SET
      ${EMPLOYEE_COLUMNS.filter((c) => c !== 'employee_id').map((c) => `${c} = @${c}`).join(', ')},
      uploaded_at = datetime('now')
  `);
  const tx = db.transaction((records) => {
    for (const r of records) insert.run(r);
  });
  tx(rows);
}

export function getEmployeeById(employeeId) {
  return db.prepare('SELECT * FROM employees WHERE employee_id = ?').get(employeeId) || null;
}

export function listEmployees() {
  return db.prepare('SELECT * FROM employees ORDER BY last_name, first_name').all();
}

export function countEmployees() {
  return db.prepare('SELECT COUNT(*) AS n FROM employees').get().n;
}

export function countActiveEmployees() {
  return db.prepare('SELECT COUNT(*) AS n FROM employees WHERE active = 1').get().n;
}

// --- Surveys ---

export function createSurvey({ title, description }) {
  const info = db.prepare('INSERT INTO surveys (title, description) VALUES (?, ?)').run(title, description || null);
  return getSurveyById(info.lastInsertRowid);
}

export function listSurveys() {
  return db.prepare('SELECT * FROM surveys ORDER BY created_at DESC').all();
}

export function getSurveyById(id) {
  return db.prepare('SELECT * FROM surveys WHERE id = ?').get(id) || null;
}

export function getOpenSurvey() {
  return db.prepare("SELECT * FROM surveys WHERE status = 'open' ORDER BY updated_at DESC LIMIT 1").get() || null;
}

export function updateSurvey(id, fields) {
  const existing = getSurveyById(id);
  if (!existing) return null;
  const data = {
    title: fields.title ?? existing.title,
    description: fields.description ?? existing.description,
    status: fields.status ?? existing.status,
  };
  db.prepare(`
    UPDATE surveys SET title = @title, description = @description, status = @status, updated_at = datetime('now')
    WHERE id = @id
  `).run({ ...data, id });
  return getSurveyById(id);
}

export function deleteSurvey(id) {
  db.prepare('DELETE FROM surveys WHERE id = ?').run(id);
}

export function closeOtherOpenSurveys(exceptId) {
  db.prepare("UPDATE surveys SET status = 'closed', updated_at = datetime('now') WHERE status = 'open' AND id != ?").run(exceptId);
}

// --- Questions ---

export function listQuestions(surveyId) {
  return db.prepare('SELECT * FROM questions WHERE survey_id = ? ORDER BY position, id').all(surveyId);
}

export function getQuestionById(id) {
  return db.prepare('SELECT * FROM questions WHERE id = ?').get(id) || null;
}

export function createQuestion(surveyId, { prompt, type, options, required, position, section, category }) {
  const nextPos = position ?? (db.prepare('SELECT COALESCE(MAX(position), -1) + 1 AS p FROM questions WHERE survey_id = ?').get(surveyId).p);
  const info = db.prepare(`
    INSERT INTO questions (survey_id, position, prompt, type, options, required, section, category)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    surveyId, nextPos, prompt, type || 'likert5', options ? JSON.stringify(options) : null,
    required === false ? 0 : 1, section || null, category || null
  );
  return getQuestionById(info.lastInsertRowid);
}

export function updateQuestion(id, fields) {
  const existing = getQuestionById(id);
  if (!existing) return null;
  const data = {
    prompt: fields.prompt ?? existing.prompt,
    type: fields.type ?? existing.type,
    options: fields.options !== undefined ? (fields.options ? JSON.stringify(fields.options) : null) : existing.options,
    required: fields.required !== undefined ? (fields.required ? 1 : 0) : existing.required,
    position: fields.position ?? existing.position,
    section: fields.section !== undefined ? fields.section : existing.section,
    category: fields.category !== undefined ? fields.category : existing.category,
  };
  db.prepare(`
    UPDATE questions SET prompt = @prompt, type = @type, options = @options, required = @required,
      position = @position, section = @section, category = @category
    WHERE id = @id
  `).run({ ...data, id });
  return getQuestionById(id);
}

export function deleteQuestion(id) {
  db.prepare('DELETE FROM questions WHERE id = ?').run(id);
}

export function reorderQuestions(surveyId, orderedIds) {
  const tx = db.transaction((ids) => {
    ids.forEach((qid, idx) => {
      db.prepare('UPDATE questions SET position = ? WHERE id = ? AND survey_id = ?').run(idx, qid, surveyId);
    });
  });
  tx(orderedIds);
}

// --- Responses / Answers ---

export function hasResponded(surveyId, employeeId) {
  return !!db.prepare('SELECT 1 FROM responses WHERE survey_id = ? AND employee_id = ?').get(surveyId, employeeId);
}

export function createResponse(surveyId, employeeId, answers) {
  const tx = db.transaction(() => {
    const info = db.prepare('INSERT INTO responses (survey_id, employee_id) VALUES (?, ?)').run(surveyId, employeeId);
    const responseId = info.lastInsertRowid;
    const insertAnswer = db.prepare('INSERT INTO answers (response_id, question_id, value) VALUES (?, ?, ?)');
    for (const a of answers) {
      insertAnswer.run(responseId, a.questionId, a.value);
    }
    return responseId;
  });
  return tx();
}

export function countResponses(surveyId) {
  return db.prepare('SELECT COUNT(*) AS n FROM responses WHERE survey_id = ?').get(surveyId).n;
}

export function listResponsesWithEmployee(surveyId) {
  return db.prepare(`
    SELECT r.*, e.last_name, e.first_name, e.department, e.company_name, e.work_location_name,
           e.job_title, e.gender, e.ethnicity_race, e.pay_type, e.supervisor_name
    FROM responses r
    LEFT JOIN employees e ON e.employee_id = r.employee_id
    WHERE r.survey_id = ?
    ORDER BY r.submitted_at
  `).all(surveyId);
}

export function listAnswersForSurvey(surveyId) {
  return db.prepare(`
    SELECT a.*, r.employee_id, r.id AS response_id
    FROM answers a
    JOIN responses r ON r.id = a.response_id
    WHERE r.survey_id = ?
  `).all(surveyId);
}
