import { useState } from 'react';

function emptyValues(fields) {
  const values = {};
  for (const field of fields) {
    values[field.key] = field.type === 'checkbox' ? false : '';
  }
  return values;
}

export default function RecordForm({ fields, initialValues, onSubmit, onCancel }) {
  const [values, setValues] = useState(() => ({ ...emptyValues(fields), ...initialValues }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function setField(key, value) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    for (const field of fields) {
      if (field.required && !values[field.key]) {
        setError(`${field.label} is required.`);
        return;
      }
    }
    setSaving(true);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      {error && (
        <div className="error-banner full" style={{ gridColumn: '1 / -1' }}>
          {error}
        </div>
      )}
      {fields.map((field) => {
        const fullWidth = field.type === 'textarea';
        return (
          <div key={field.key} className={`form-field ${fullWidth ? 'full' : ''}`}>
            <label htmlFor={field.key}>{field.label}</label>
            {field.type === 'textarea' && (
              <textarea
                id={field.key}
                value={values[field.key] || ''}
                onChange={(e) => setField(field.key, e.target.value)}
              />
            )}
            {field.type === 'select' && (
              <select
                id={field.key}
                value={values[field.key] || ''}
                onChange={(e) => setField(field.key, e.target.value)}
              >
                <option value="">Select...</option>
                {field.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}
            {field.type === 'checkbox' && (
              <input
                id={field.key}
                type="checkbox"
                checked={!!values[field.key]}
                onChange={(e) => setField(field.key, e.target.checked)}
                style={{ width: 18, height: 18 }}
              />
            )}
            {(field.type === 'text' || field.type === 'date') && (
              <input
                id={field.key}
                type={field.type}
                value={values[field.key] || ''}
                onChange={(e) => setField(field.key, e.target.value)}
              />
            )}
          </div>
        );
      })}
      <div className="form-actions">
        <button className="btn" type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button className="btn secondary" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
