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
  const [section, setSection] = useState('');
  const [category, setCategory] = useState('');
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
      await onAdd({
        prompt: prompt.trim(),
        type,
        options: opts.length ? opts : null,
        required,
        section: section.trim() || null,
        category: category.trim() || null,
      });
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
      <div className="field" style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <label htmlFor="section">Section (where it appears in the survey)</label>
          <input
            id="section"
            type="text"
            value={section}
            onChange={(e) => setSection(e.target.value)}
            placeholder="e.g. Your Manager"
          />
        </div>
        <div style={{ flex: 1 }}>
          <label htmlFor="category">Category / Factor (results grouping)</label>
          <input
            id="category"
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Management"
          />
        </div>
      </div>
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
          likert5, single_choice, multi_choice, text. Section/category aren't set this way — use the
          single-question form or a file import for those.
        </div>
      </div>
      <button type="submit" className="btn btn-secondary" disabled={busy}>
        {busy ? 'Importing…' : 'Import Questions'}
      </button>
    </form>
  );
}

function FileImportForm({ onImport }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [imported, setImported] = useState(0);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setWarnings([]);
    setImported(0);
    if (!file) return;
    setBusy(true);
    try {
      const data = await onImport(file);
      setWarnings(data.warnings || []);
      setImported(data.questions?.length || 0);
      setFile(null);
      e.target.reset();
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
      {imported > 0 && <div className="success-banner">Imported {imported} questions.</div>}
      {warnings.length > 0 && (
        <div className="info-banner">
          {warnings.map((w, i) => (
            <div key={i}>{w}</div>
          ))}
        </div>
      )}
      <div className="field">
        <label htmlFor="questionFile">Question spreadsheet (.csv)</label>
        <input id="questionFile" type="file" accept=".csv" onChange={(e) => setFile(e.target.files[0])} />
        <div className="hint">
          Works with exports that have <code>Section</code>, <code>Factor</code> (or{' '}
          <code>Category</code>), <code>Question</code>, and <code>Question Type</code> columns —
          question types <code>rating</code>, <code>free_text</code>, and <code>select</code> are
          recognized. <code>demographic</code> rows are skipped, since demographic data comes from the
          employee roster upload instead. If your file is an Excel workbook, open it and use
          File → Save As → CSV first.
        </div>
      </div>
      <button type="submit" className="btn btn-secondary" disabled={!file || busy}>
        {busy ? 'Importing…' : 'Import from File'}
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

  async function handleFileImport(file) {
    const form = new FormData();
    form.append('file', file);
    const data = await api.post(`/api/admin/surveys/${id}/questions/import`, form);
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

  // Group questions by section for display, preserving position order.
  const groups = [];
  for (const q of questions) {
    const label = q.section || 'Ungrouped';
    let group = groups[groups.length - 1];
    if (!group || group.label !== label) {
      group = { label, items: [] };
      groups.push(group);
    }
    group.items.push(q);
  }

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
        {groups.map((group) => (
          <div key={group.label} style={{ marginBottom: 20 }}>
            {questions.some((q) => q.section) && (
              <h3 style={{ fontSize: '0.9rem', color: 'var(--gray-600)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 10 }}>
                {group.label}
              </h3>
            )}
            {group.items.map((q) => {
              const i = questions.indexOf(q);
              return (
                <div className="question-editor-item" key={q.id}>
                  <div>
                    <div className="qtype">
                      {TYPE_LABEL[q.type]}
                      {!q.required && ' · optional'}
                      {q.category && ` · ${q.category}`}
                    </div>
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
              );
            })}
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
          <button type="button" className={tab === 'file' ? 'active' : ''} onClick={() => setTab('file')}>
            Import from file
          </button>
        </div>
        {tab === 'add' && <QuestionForm onAdd={handleAddQuestion} />}
        {tab === 'bulk' && <BulkImportForm onImport={handleBulkImport} />}
        {tab === 'file' && <FileImportForm onImport={handleFileImport} />}
      </div>
    </div>
  );
}
