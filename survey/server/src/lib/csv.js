import { parse } from 'csv-parse/sync';

function normalizeHeader(h) {
  return String(h || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

// Maps normalized header text -> employees table column.
const HEADER_ALIASES = {
  employeeid: 'employee_id',
  empid: 'employee_id',
  id: 'employee_id',

  lastname: 'last_name',
  firstname: 'first_name',

  birthdate: 'birth_date',
  dateofbirth: 'birth_date',
  dob: 'birth_date',

  hiredate: 'hire_date',

  supervisorsemployeeid: 'supervisor_employee_id',
  supervisoremployeeid: 'supervisor_employee_id',
  supervisorid: 'supervisor_employee_id',

  supervisorsnamelastfirst: 'supervisor_name',
  supervisorname: 'supervisor_name',
  supervisor: 'supervisor_name',

  positionjobtitle: 'job_title',
  jobtitle: 'job_title',
  position: 'job_title',
  title: 'job_title',

  department: 'department',
  dept: 'department',

  companycode: 'company_code',
  companyname: 'company_name',
  company: 'company_name',

  worklocationname: 'work_location_name',
  worklocation: 'work_location_name',
  location: 'work_location_name',
  site: 'work_location_name',

  gender: 'gender',
  sex: 'gender',

  legalethnicityracedescription: 'ethnicity_race',
  ethnicityracedescription: 'ethnicity_race',
  ethnicityrace: 'ethnicity_race',
  ethnicity: 'ethnicity_race',
  race: 'ethnicity_race',

  paytype: 'pay_type',

  active: 'active',
  status: 'active',
  employeestatus: 'active',
};

const ACTIVE_TRUE_VALUES = new Set(['active', 'true', 'yes', 'y', '1', 'a']);
const ACTIVE_FALSE_VALUES = new Set(['inactive', 'terminated', 'term', 'false', 'no', 'n', '0', 't']);

function parseActive(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return 1;
  const v = String(raw).trim().toLowerCase();
  if (ACTIVE_TRUE_VALUES.has(v)) return 1;
  if (ACTIVE_FALSE_VALUES.has(v)) return 0;
  return 1;
}

const ALL_COLUMNS = [
  'employee_id', 'last_name', 'first_name', 'birth_date', 'hire_date',
  'supervisor_employee_id', 'supervisor_name', 'job_title', 'department',
  'company_code', 'company_name', 'work_location_name', 'gender',
  'ethnicity_race', 'pay_type',
];

export function parseEmployeesCsv(buffer) {
  const text = buffer.toString('utf8').replace(/^﻿/, '');
  const records = parse(text, { columns: true, skip_empty_lines: true, trim: true });

  if (records.length === 0) {
    return { rows: [], errors: ['The file has no data rows.'] };
  }

  const rawHeaders = Object.keys(records[0]);
  const headerMap = {}; // rawHeader -> column
  for (const h of rawHeaders) {
    const norm = normalizeHeader(h);
    if (HEADER_ALIASES[norm]) headerMap[h] = HEADER_ALIASES[norm];
  }

  if (!Object.values(headerMap).includes('employee_id')) {
    return { rows: [], errors: ['Could not find an "Employee Id" column in the file.'] };
  }

  const rows = [];
  const errors = [];
  const seen = new Set();

  records.forEach((record, idx) => {
    const row = {};
    for (const col of ALL_COLUMNS) row[col] = null;
    row.active = 1;

    for (const [rawHeader, value] of Object.entries(record)) {
      const col = headerMap[rawHeader];
      if (!col) continue;
      if (col === 'active') {
        row.active = parseActive(value);
      } else {
        const v = value === undefined || value === null ? '' : String(value).trim();
        row[col] = v === '' ? null : v;
      }
    }

    const rowNum = idx + 2; // account for header row, 1-indexed
    if (!row.employee_id) {
      errors.push(`Row ${rowNum}: missing Employee Id, skipped.`);
      return;
    }
    if (seen.has(row.employee_id)) {
      errors.push(`Row ${rowNum}: duplicate Employee Id "${row.employee_id}", later row used.`);
    }
    seen.add(row.employee_id);
    rows.push(row);
  });

  // De-dupe, keeping the last occurrence for a given employee_id.
  const byId = new Map();
  for (const row of rows) byId.set(row.employee_id, row);

  return { rows: [...byId.values()], errors };
}

export const EMPLOYEE_TEMPLATE_HEADERS = [
  'Last Name', 'First Name', 'Employee Id', 'Birth Date', 'Hire Date',
  "Supervisor's Employee ID", "Supervisor's Name (Last, First)", 'Position Job Title',
  'Department', 'Company Code', 'Company Name', 'Work Location Name', 'Gender',
  'Legal Ethnicity/Race Description', 'Pay Type', 'Active',
];

function csvEscape(value) {
  const s = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function toCsv(headers, rows) {
  const lines = [headers.map(csvEscape).join(',')];
  for (const row of rows) {
    lines.push(row.map(csvEscape).join(','));
  }
  return lines.join('\r\n');
}
