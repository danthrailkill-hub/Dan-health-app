import { parse } from 'csv-parse/sync';
import { normalizeType } from './questions.js';

function normalizeHeader(h) {
  return String(h || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

// Classifies a header cell by keyword, not exact match — real-world exports (e.g. Culture
// Amp's question bank) use verbose headers like "Section (where questions appear in the
// survey)" or "Factor (displayed heading in the reports)", not bare "Section"/"Factor".
// Checked in order: more specific patterns (question code/type) must be ruled out before
// the generic "question" -> prompt fallback.
function classifyHeader(rawHeader) {
  const n = normalizeHeader(rawHeader);
  if (!n) return null;
  if (n.includes('questioncode') || n.includes('code')) return null;
  if (n.includes('questiontype') || n === 'type' || n.includes('answertype')) return 'type';
  if (n.includes('selectoption') || n.includes('answeroption') || n.includes('option') || n.includes('choice')) return 'options';
  if (n.includes('section') || n.includes('page')) return 'section';
  if (n.includes('factor') || n.includes('category')) return 'category';
  if (n.includes('required')) return 'required';
  if (n.includes('question') || n === 'prompt') return 'prompt';
  return null;
}

function isXlsx(buffer, filename) {
  if (filename && /\.xlsx?$/i.test(filename)) return true;
  // XLSX files are zip archives; sniff the "PK" magic bytes as a fallback.
  return buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4b;
}

function rowsFromBuffer(buffer, filename) {
  if (isXlsx(buffer, filename)) {
    const err = new Error('Excel (.xlsx) files aren\'t supported for import — please open the file and use File → Save As → CSV, then upload the .csv instead.');
    err.isUserError = true;
    throw err;
  }
  const text = buffer.toString('utf8').replace(/^﻿/, '');
  return parse(text, { columns: false, skip_empty_lines: true, relax_column_count: true });
}

// A real header cell is a short label ("Question", "Question Text"); an instructional
// row (some templates include one, e.g. "Enter your question text here...") reads as a
// full sentence. Cap length and reject embedded newlines/sentence punctuation so a
// verbose instructions row is never mistaken for the header row.
function looksLikeHeaderCell(raw) {
  const text = String(raw || '').trim();
  return text.length > 0 && text.length <= 40 && !/[\n.!?]/.test(text);
}

function findHeaderRow(rows) {
  const limit = Math.min(rows.length, 10);
  for (let i = 0; i < limit; i++) {
    if (rows[i].some((c) => looksLikeHeaderCell(c) && classifyHeader(c) === 'prompt')) return i;
  }
  return -1;
}

function parseOptionsCell(raw) {
  const text = String(raw || '').trim();
  if (!text || /^n\/?a$/i.test(text)) return null;
  let parts;
  if (text.includes('\n')) parts = text.split('\n');
  else if (text.includes(';')) parts = text.split(';');
  else parts = text.split(',');
  const options = parts.map((p) => p.trim()).filter(Boolean);
  return options.length > 0 ? options : null;
}

export function parseQuestionsFile(buffer, filename) {
  const rows = rowsFromBuffer(buffer, filename);
  const headerIdx = findHeaderRow(rows);
  if (headerIdx === -1) {
    return { questions: [], errors: ['Could not find a "Question" column in the file.'] };
  }

  const headerRow = rows[headerIdx];
  const colMap = {}; // column index -> field name
  headerRow.forEach((h, idx) => {
    const field = classifyHeader(h);
    if (field) colMap[idx] = field;
  });

  const questions = [];
  const errors = [];

  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every((cell) => String(cell ?? '').trim() === '')) continue;

    const record = {};
    for (const [idx, field] of Object.entries(colMap)) {
      record[field] = row[idx];
    }

    const rowNum = r + 1;
    const prompt = String(record.prompt || '').trim();
    if (!prompt) {
      errors.push(`Row ${rowNum}: missing question text, skipped.`);
      continue;
    }

    const rawType = String(record.type || '').trim();
    if (/^demographic$/i.test(rawType)) {
      errors.push(`Row ${rowNum}: "${prompt}" is a demographic question, skipped — demographic data comes from the employee roster upload instead.`);
      continue;
    }

    const type = normalizeType(rawType);
    const options = parseOptionsCell(record.options);
    if ((type === 'single_choice' || type === 'multi_choice') && (!options || options.length < 2)) {
      errors.push(`Row ${rowNum}: "${prompt}" is a choice question but has no select options in the file — add them in the survey builder after import.`);
    }

    const requiredCell = record.required !== undefined ? String(record.required).trim().toLowerCase() : '';
    const required = requiredCell === '' ? true : !['no', 'false', 'optional', '0'].includes(requiredCell);

    questions.push({
      prompt,
      type,
      options: options || undefined,
      required,
      section: record.section ? String(record.section).trim() : null,
      category: record.category ? String(record.category).trim() : null,
    });
  }

  return { questions, errors };
}
