import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';

const TYPE_LABEL = {
  likert5: 'Rating (1-5)',
  single_choice: 'Single choice',
  multi_choice: 'Multiple choice',
  text: 'Open text',
};

function QuestionForm({ onAdd }) {
  const [prompt, setPrompt] = useState('');
  const [type, setType] = useState('likert5');
  const [options, setOptions] = useState('');
  const [required, setRequired] = useState(true);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!prompt.trim()) return;
    const opts = options
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
    if ((type === 'single_choice' || type === 'multi_choice') && opts.length < 2) {
      setError('Choice questions need at least two comma-separated options.');
      return;
    }
    try {
      await onAdd({ prompt: prompt.trim(), type, options: opts.length ? opts : null, required });
      setPrompt('');
      setOptions('');
      setRequired(true);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error-banner">{error}</div>}
      <div className="field">
        <label htmlFor="prompt">Question</label>
        <input id="prompt" type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="type">Answer type</label>
        <select id="type" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="likert5">Rating (1-5, Strongly Disagree to Strongly Agree)</option>
          <option value="single_choice">Single choice</option>
          <option value="multi_choice">Multiple choice</option>
          <option value="text">Open text</option>
        </select>
      </div>
      {(type === 'single_choice' || type === 'multi_choice') && (
        <div className="field">
          <label htmlFor="options">Options (comma-separated)</label>
          <input
            id="options"
            type="text"
            value={options}
            onChange={(e) => setOptions(e.target.value)}
            placeholder="Day shift, Evening shift, Night shift"
          />
        </div>
      )}
      <div className="field">
        <label className="choice-option" style={{ padding: 0 }}>
          <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
          Required
        </label>
      </div>
      <button type="submit" className="btn btn-primary">
        Add Question
      </button>
    </form>
  );
}

function BulkImportForm({ onImport }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setWarnings([]);
    if (!text.trim()) return;
    setBusy(true);
    try {
      const data = await onImport(text);
      setWarnings(data.warnings || []);
      setText('');
    } catch (err) {
      setError(err.message);
      setWarnings(err.details || []);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error-banner">{error}</div>}
      {warnings.length > 0 && (
        <div className="info-banner">
          {warnings.map((w, i) => (
            <div key={i}>{w}</div>
          ))}
        </div>
      )}
      <div className="field">
        <label htmlFor="bulk">Paste questions, one per line</label>
        <textarea
          id="bulk"
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            'I feel valued at work | likert5\n' +
            'Which shift do you work? | single_choice | Day, Evening, Night\n' +
            'What could we do better? | text | | optional'
          }
        />
        <div className="hint">
          Format: <code>question | type | options (comma-separated) | optional</code>. Type and everything
          after it can be left off — questions default to a 1-5 rating and are required. Valid types:
          likert5, single_choice, multi_choice, text.
        </div>
      </div>
      <button type="submit" className="btn btn-secondary" disabled={busy}>
        {busy ? 'Importing…' : 'Import Questions'}
      </button>
    </form>
  );
}

export default function AdminSurveyEditor() {
  const { id } = useParams();
  const [survey, setSurvey] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('add');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [descDraft, setDescDraft] = useState('');

  function load() {
    api
      .get(`/api/admin/surveys/${id}`)
      .then((data) => {
        setSurvey(data.survey);
        setQuestions(data.questions);
        setTitleDraft(data.survey.title);
        setDescDraft(data.survey.description || '');
      })
      .catch((err) => setError(err.message));
  }

  useEffect(load, [id]);

  async function handleAddQuestion(payload) {
    await api.post(`/api/admin/surveys/${id}/questions`, payload);
    load();
  }

  async function handleBulkImport(text) {
    const data = await api.post(`/api/admin/surveys/${id}/questions/bulk`, { text });
    load();
    return data;
  }

  async function handleDeleteQuestion(qid) {
    if (!window.confirm('Delete this question?')) return;
    await api.del(`/api/admin/surveys/${id}/questions/${qid}`);
    load();
  }

  async function handleToggleRequired(q) {
    await api.patch(`/api/admin/surveys/${id}/questions/${q.id}`, { required: !q.required });
    load();
  }

  async function move(index, direction) {
    const newOrder = [...questions];
    const target = index + direction;
    if (target < 0 || target >= newOrder.length) return;
    [newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]];
    setQuestions(newOrder);
    await api.put(`/api/admin/surveys/${id}/questions/reorder`, { orderedIds: newOrder.map((q) => q.id) });
  }

  async function saveTitle() {
    await api.patch(`/api/admin/surveys/${id}`, { title: titleDraft, description: descDraft });
    setEditingTitle(false);
    load();
  }

  async function setStatus(status) {
    await api.patch(`/api/admin/surveys/${id}`, { status });
    load();
  }

  if (error) return <div className="error-banner">{error}</div>;
  if (!survey) return <p>Loading…</p>;

  return (
    <div>
      <Link className="link-back" to="/admin/surveys">
        ← Back to surveys
      </Link>

      <div className="section-header" style={{ marginTop: 12 }}>
        <div>
          {editingTitle ? (
            <div className="panel" style={{ marginBottom: 0 }}>
              <div className="field">
                <label htmlFor="titleDraft">Title</label>
                <input id="titleDraft" type="text" value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="descDraft">Description</label>
                <textarea id="descDraft" value={descDraft} onChange={(e) => setDescDraft(e.target.value)} />
              </div>
              <div className="actions-row">
                <button type="button" className="btn btn-primary" onClick={saveTitle}>
                  Save
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setEditingTitle(false)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <h1>
                {survey.title} <span className={`badge badge-${survey.status}`}>{survey.status}</span>
              </h1>
              {survey.description && <p style={{ color: 'var(--gray-600)' }}>{survey.description}</p>}
            </>
          )}
        </div>
        {!editingTitle && (
          <div className="actions-row">
            <button type="button" className="btn btn-ghost" onClick={() => setEditingTitle(true)}>
              Edit Details
            </button>
            {survey.status !== 'open' && (
              <button type="button" className="btn btn-secondary" onClick={() => setStatus('open')}>
                Open Survey
              </button>
            )}
            {survey.status === 'open' && (
              <button type="button" className="btn btn-ghost" onClick={() => setStatus('closed')}>
                Close Survey
              </button>
            )}
          </div>
        )}
      </div>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Questions ({questions.length})</h2>
        {questions.length === 0 && <p style={{ color: 'var(--gray-600)' }}>No questions yet.</p>}
        {questions.map((q, i) => (
          <div className="question-editor-item" key={q.id}>
            <div>
              <div className="qtype">{TYPE_LABEL[q.type]}{!q.required && ' · optional'}</div>
              <div>{q.prompt}</div>
              {q.options && <div className="hint">{JSON.parse(q.options).join(', ')}</div>}
            </div>
            <div className="actions-row">
              <button type="button" className="btn btn-ghost" onClick={() => move(i, -1)} disabled={i === 0}>
                ↑
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => move(i, 1)}
                disabled={i === questions.length - 1}
              >
                ↓
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => handleToggleRequired(q)}>
                {q.required ? 'Make optional' : 'Make required'}
              </button>
              <button type="button" className="btn btn-danger" onClick={() => handleDeleteQuestion(q.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="tabs">
          <button type="button" className={tab === 'add' ? 'active' : ''} onClick={() => setTab('add')}>
            Add one question
          </button>
          <button type="button" className={tab === 'bulk' ? 'active' : ''} onClick={() => setTab('bulk')}>
            Bulk import
          </button>
        </div>
        {tab === 'add' ? <QuestionForm onAdd={handleAddQuestion} /> : <BulkImportForm onImport={handleBulkImport} />}
      </div>
    </div>
  );
}
