import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const FIELDS = [
  { key: 'full_name', label: 'Full name', type: 'text' },
  { key: 'date_of_birth', label: 'Date of birth', type: 'date' },
  { key: 'sex', label: 'Sex', type: 'text' },
  { key: 'blood_type', label: 'Blood type', type: 'text' },
  { key: 'height_cm', label: 'Height (cm)', type: 'number' },
  { key: 'weight_kg', label: 'Weight (kg)', type: 'number' },
  { key: 'notes', label: 'Notes (e.g. implants, directives)', type: 'textarea' },
];

export default function Profile() {
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/api/profile')
      .then(setValues)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function setField(key, value) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setMessage('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const updated = await api.put('/api/profile', values);
      setValues(updated);
      setMessage('Saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <div className="page-header">
        <h2>Profile</h2>
        <p>Core identity and vitals shown first to anyone treating you.</p>
      </div>
      {error && <div className="error-banner">{error}</div>}
      <div className="card">
        <form className="form-grid" onSubmit={handleSubmit}>
          {FIELDS.map((field) => (
            <div key={field.key} className={`form-field ${field.type === 'textarea' ? 'full' : ''}`}>
              <label htmlFor={field.key}>{field.label}</label>
              {field.type === 'textarea' ? (
                <textarea
                  id={field.key}
                  value={values[field.key] || ''}
                  onChange={(e) => setField(field.key, e.target.value)}
                />
              ) : (
                <input
                  id={field.key}
                  type={field.type}
                  value={values[field.key] ?? ''}
                  onChange={(e) => setField(field.key, e.target.value)}
                />
              )}
            </div>
          ))}
          <div className="form-actions">
            <button className="btn" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save profile'}
            </button>
            {message && <span style={{ color: 'var(--text-muted)', alignSelf: 'center', fontSize: 13 }}>{message}</span>}
          </div>
        </form>
      </div>
    </div>
  );
}
