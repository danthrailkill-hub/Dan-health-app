import express from 'express';
import {
  getSurveyById, listQuestions, listResponsesWithEmployee, listAnswersForSurvey, countResponses, countActiveEmployees,
} from '../db.js';
import { toCsv } from '../lib/csv.js';

const router = express.Router();

function buildAggregate(survey) {
  const questions = listQuestions(survey.id);
  const answers = listAnswersForSurvey(survey.id);
  const byQuestion = new Map(questions.map((q) => [q.id, { ...q, options: q.options ? JSON.parse(q.options) : null }]));

  const grouped = new Map();
  for (const q of questions) grouped.set(q.id, []);
  for (const a of answers) {
    if (grouped.has(a.question_id)) grouped.get(a.question_id).push(a.value);
  }

  return questions.map((q) => {
    const meta = byQuestion.get(q.id);
    const values = grouped.get(q.id) || [];
    const answered = values.length;

    if (meta.type === 'likert5') {
      const nums = values.map(Number).filter((n) => Number.isFinite(n));
      const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      nums.forEach((n) => { if (counts[n] !== undefined) counts[n] += 1; });
      const average = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
      return { id: q.id, prompt: q.prompt, type: q.type, answered, average, counts };
    }

    if (meta.type === 'single_choice') {
      const counts = {};
      (meta.options || []).forEach((o) => { counts[o] = 0; });
      values.forEach((v) => { counts[v] = (counts[v] || 0) + 1; });
      return { id: q.id, prompt: q.prompt, type: q.type, answered, counts };
    }

    if (meta.type === 'multi_choice') {
      const counts = {};
      (meta.options || []).forEach((o) => { counts[o] = 0; });
      values.forEach((v) => {
        let arr = [];
        try { arr = JSON.parse(v); } catch { arr = [v]; }
        arr.forEach((opt) => { counts[opt] = (counts[opt] || 0) + 1; });
      });
      return { id: q.id, prompt: q.prompt, type: q.type, answered, counts };
    }

    // text
    return { id: q.id, prompt: q.prompt, type: q.type, answered, responses: values };
  });
}

router.get('/:id/results', (req, res) => {
  const survey = getSurveyById(req.params.id);
  if (!survey) return res.status(404).json({ error: 'Survey not found' });

  res.json({
    survey,
    responseCount: countResponses(survey.id),
    activeEmployeeCount: countActiveEmployees(),
    questions: buildAggregate(survey),
  });
});

router.get('/:id/export.csv', (req, res) => {
  const survey = getSurveyById(req.params.id);
  if (!survey) return res.status(404).json({ error: 'Survey not found' });

  const questions = listQuestions(survey.id);
  const responses = listResponsesWithEmployee(survey.id);
  const answers = listAnswersForSurvey(survey.id);

  const answersByResponse = new Map();
  for (const a of answers) {
    if (!answersByResponse.has(a.response_id)) answersByResponse.set(a.response_id, new Map());
    answersByResponse.get(a.response_id).set(a.question_id, a.value);
  }

  const demoHeaders = [
    'Employee ID', 'Last Name', 'First Name', 'Department', 'Company Name',
    'Work Location', 'Job Title', 'Gender', 'Ethnicity/Race', 'Pay Type',
    'Supervisor', 'Submitted At',
  ];
  const questionHeaders = questions.map((q) => q.prompt);
  const headers = [...demoHeaders, ...questionHeaders];

  const rows = responses.map((r) => {
    const answerMap = answersByResponse.get(r.id) || new Map();
    const demoCells = [
      r.employee_id, r.last_name, r.first_name, r.department, r.company_name,
      r.work_location_name, r.job_title, r.gender, r.ethnicity_race, r.pay_type,
      r.supervisor_name, r.submitted_at,
    ];
    const answerCells = questions.map((q) => {
      const raw = answerMap.get(q.id);
      if (raw === undefined || raw === null) return '';
      if (q.type === 'multi_choice') {
        try { return JSON.parse(raw).join('; '); } catch { return raw; }
      }
      return raw;
    });
    return [...demoCells, ...answerCells];
  });

  const csv = toCsv(headers, rows);
  const filename = `${survey.title.replace(/[^a-z0-9]+/gi, '_')}_responses.csv`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

export default router;
