import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

const STATUS_LABEL = { draft: 'Draft', open: 'Open', closed: 'Closed' };

export default function AdminSurveys() {
  const [surveys, setSurveys] = useState(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  function load() {
    api
      .get('/api/admin/surveys')
      .then((data) => setSurveys(data.surveys))
      .catch((err) => setError(err.message));
  }

  useEffect(load, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await api.post('/api/admin/surveys', { title: title.trim(), description: description.trim() });
      setTitle('');
      setDescription('');
      setCreating(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function setStatus(id, status) {
    try {
      await api.patch(`/api/admin/surveys/${id}`, { status });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this survey and all of its questions and responses? This cannot be undone.')) return;
    try {
      await api.del(`/api/admin/surveys/${id}`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="section-header">
        <h1>Surveys</h1>
        <button type="button" className="btn btn-primary" onClick={() => setCreating((v) => !v)}>
          {creating ? 'Cancel' : 'New Survey'}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {creating && (
        <div className="panel">
          <form onSubmit={handleCreate}>
            <div className="field">
              <label htmlFor="title">Title</label>
              <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
            </div>
            <div className="field">
              <label htmlFor="description">Description (shown to employees, optional)</label>
              <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary">
              Create Survey
            </button>
          </form>
        </div>
      )}

      <div className="panel">
        {surveys === null && <p>Loading…</p>}
        {surveys && surveys.length === 0 && <p>No surveys yet. Create one to get started.</p>}
        {surveys &&
          surveys.map((s) => (
            <div className="survey-list-item" key={s.id}>
              <div>
                <h3>
                  {s.title} <span className={`badge badge-${s.status}`}>{STATUS_LABEL[s.status]}</span>
                </h3>
                <div className="meta">
                  {s.responseCount} response{s.responseCount === 1 ? '' : 's'} · created{' '}
                  {new Date(s.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className="actions-row">
                <Link className="btn btn-ghost" to={`/admin/surveys/${s.id}`}>
                  Edit Questions
                </Link>
                <Link className="btn btn-ghost" to={`/admin/surveys/${s.id}/results`}>
                  Results
                </Link>
                {s.status !== 'open' && (
                  <button type="button" className="btn btn-secondary" onClick={() => setStatus(s.id, 'open')}>
                    Open
                  </button>
                )}
                {s.status === 'open' && (
                  <button type="button" className="btn btn-ghost" onClick={() => setStatus(s.id, 'closed')}>
                    Close
                  </button>
                )}
                <button type="button" className="btn btn-danger" onClick={() => handleDelete(s.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
