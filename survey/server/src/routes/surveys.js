import express from 'express';
import multer from 'multer';
import {
  listSurveys, createSurvey, getSurveyById, updateSurvey, deleteSurvey, closeOtherOpenSurveys,
  listQuestions, createQuestion, updateQuestion, deleteQuestion, reorderQuestions, getQuestionById,
  countResponses,
} from '../db.js';
import { parseBulkQuestions } from '../lib/questions.js';
import { parseQuestionsFile } from '../lib/questionFile.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router = express.Router();

router.get('/', (req, res) => {
  const surveys = listSurveys().map((s) => ({ ...s, responseCount: countResponses(s.id) }));
  res.json({ surveys });
});

router.post('/', (req, res) => {
  const { title, description } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });
  const survey = createSurvey({ title: title.trim(), description });
  res.status(201).json({ survey });
});

router.get('/:id', (req, res) => {
  const survey = getSurveyById(req.params.id);
  if (!survey) return res.status(404).json({ error: 'Survey not found' });
  res.json({ survey, questions: listQuestions(survey.id), responseCount: countResponses(survey.id) });
});

router.patch('/:id', (req, res) => {
  const existing = getSurveyById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Survey not found' });

  const { status } = req.body;
  if (status && !['draft', 'open', 'closed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const survey = updateSurvey(req.params.id, req.body);
  if (status === 'open') closeOtherOpenSurveys(survey.id);
  res.json({ survey });
});

router.delete('/:id', (req, res) => {
  deleteSurvey(req.params.id);
  res.json({ ok: true });
});

// --- Questions ---

router.get('/:id/questions', (req, res) => {
  const survey = getSurveyById(req.params.id);
  if (!survey) return res.status(404).json({ error: 'Survey not found' });
  res.json({ questions: listQuestions(survey.id) });
});

router.post('/:id/questions', (req, res) => {
  const survey = getSurveyById(req.params.id);
  if (!survey) return res.status(404).json({ error: 'Survey not found' });

  const { prompt, type, options, required, section, category } = req.body;
  if (!prompt || !prompt.trim()) return res.status(400).json({ error: 'Question prompt is required' });
  if ((type === 'single_choice' || type === 'multi_choice') && (!Array.isArray(options) || options.length < 2)) {
    return res.status(400).json({ error: 'Choice questions need at least two options' });
  }

  const question = createQuestion(survey.id, {
    prompt: prompt.trim(), type, options, required,
    section: section?.trim() || null, category: category?.trim() || null,
  });
  res.status(201).json({ question });
});

router.post('/:id/questions/bulk', (req, res) => {
  const survey = getSurveyById(req.params.id);
  if (!survey) return res.status(404).json({ error: 'Survey not found' });

  const { text } = req.body;
  const { questions, errors } = parseBulkQuestions(text);
  if (questions.length === 0) {
    return res.status(400).json({ error: 'No valid questions found', details: errors });
  }

  const created = questions.map((q) => createQuestion(survey.id, q));
  res.status(201).json({ questions: created, warnings: errors });
});

router.post('/:id/questions/import', upload.single('file'), (req, res) => {
  const survey = getSurveyById(req.params.id);
  if (!survey) return res.status(404).json({ error: 'Survey not found' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  let parsed;
  try {
    parsed = parseQuestionsFile(req.file.buffer, req.file.originalname);
  } catch (err) {
    const message = err.isUserError ? err.message : 'Could not read that file. Upload a .csv export.';
    return res.status(400).json({ error: message });
  }

  const { questions, errors } = parsed;
  if (questions.length === 0) {
    return res.status(400).json({ error: 'No valid questions found in the file', details: errors });
  }

  const created = questions.map((q) => createQuestion(survey.id, q));
  res.status(201).json({ questions: created, warnings: errors });
});

router.put('/:id/questions/reorder', (req, res) => {
  const survey = getSurveyById(req.params.id);
  if (!survey) return res.status(404).json({ error: 'Survey not found' });

  const { orderedIds } = req.body;
  if (!Array.isArray(orderedIds)) return res.status(400).json({ error: 'orderedIds must be an array' });
  reorderQuestions(survey.id, orderedIds);
  res.json({ questions: listQuestions(survey.id) });
});

router.patch('/:surveyId/questions/:questionId', (req, res) => {
  const existing = getQuestionById(req.params.questionId);
  if (!existing || String(existing.survey_id) !== req.params.surveyId) {
    return res.status(404).json({ error: 'Question not found' });
  }
  const question = updateQuestion(req.params.questionId, req.body);
  res.json({ question });
});

router.delete('/:surveyId/questions/:questionId', (req, res) => {
  const existing = getQuestionById(req.params.questionId);
  if (!existing || String(existing.survey_id) !== req.params.surveyId) {
    return res.status(404).json({ error: 'Question not found' });
  }
  deleteQuestion(req.params.questionId);
  res.json({ ok: true });
});

export default router;
