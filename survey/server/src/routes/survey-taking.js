import express from 'express';
import { requireEmployeeAuth } from '../auth.js';
import { getOpenSurvey, getSurveyById, listQuestions, hasResponded, createResponse, getEmployeeById } from '../db.js';

const router = express.Router();

router.use(requireEmployeeAuth);

router.get('/current', (req, res) => {
  const employee = getEmployeeById(req.employeeId);
  if (!employee || !employee.active) return res.status(401).json({ error: 'Session no longer valid' });

  const survey = getOpenSurvey();
  if (!survey) return res.status(404).json({ error: 'No survey is currently open' });

  const questions = listQuestions(survey.id).map((q) => ({
    id: q.id,
    prompt: q.prompt,
    type: q.type,
    options: q.options ? JSON.parse(q.options) : null,
    required: !!q.required,
    section: q.section,
  }));

  res.json({
    survey: { id: survey.id, title: survey.title, description: survey.description },
    questions,
    alreadyCompleted: hasResponded(survey.id, req.employeeId),
  });
});

function validateAnswer(question, rawValue) {
  const isBlank = rawValue === undefined || rawValue === null || rawValue === '' ||
    (Array.isArray(rawValue) && rawValue.length === 0);

  if (isBlank) {
    if (question.required) return { error: `"${question.prompt}" is required.` };
    return { value: null };
  }

  const options = question.options ? JSON.parse(question.options) : null;

  switch (question.type) {
    case 'likert5': {
      const n = Number(rawValue);
      if (!Number.isInteger(n) || n < 1 || n > 5) return { error: `"${question.prompt}" must be a rating from 1 to 5.` };
      return { value: String(n) };
    }
    case 'single_choice': {
      if (!options || !options.includes(rawValue)) return { error: `"${question.prompt}" has an invalid selection.` };
      return { value: rawValue };
    }
    case 'multi_choice': {
      const values = Array.isArray(rawValue) ? rawValue : [rawValue];
      if (!options || !values.every((v) => options.includes(v))) {
        return { error: `"${question.prompt}" has an invalid selection.` };
      }
      return { value: JSON.stringify(values) };
    }
    case 'text': {
      const text = String(rawValue).slice(0, 5000);
      return { value: text };
    }
    default:
      return { error: `"${question.prompt}" has an unsupported question type.` };
  }
}

router.post('/:id/submit', (req, res) => {
  const employee = getEmployeeById(req.employeeId);
  if (!employee || !employee.active) return res.status(401).json({ error: 'Session no longer valid' });

  const survey = getSurveyById(req.params.id);
  if (!survey || survey.status !== 'open') {
    return res.status(409).json({ error: 'This survey is not currently open for responses.' });
  }

  if (hasResponded(survey.id, req.employeeId)) {
    return res.status(409).json({ error: 'You have already completed this survey. Thank you!' });
  }

  const questions = listQuestions(survey.id);
  const submitted = req.body.answers || {};

  const answers = [];
  for (const q of questions) {
    const result = validateAnswer(q, submitted[q.id]);
    if (result.error) return res.status(400).json({ error: result.error });
    if (result.value !== null) answers.push({ questionId: q.id, value: result.value });
  }

  createResponse(survey.id, req.employeeId, answers);
  res.status(201).json({ ok: true });
});

export default router;
