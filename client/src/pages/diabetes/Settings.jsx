import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { fromDisplay, reloadDiabetesSettings, toDisplay } from '../../lib/glucose';

const THRESHOLDS = [
  { key: 'very_low', label: 'Very low below' },
  { key: 'target_low', label: 'Target range from' },
  { key: 'target_high', label: 'Target range to' },
  { key: 'very_high', label: 'Very high above' },
];

export default function DiabetesSettings() {
  const [s, setS] = useState(null);
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function fill(settings) {
    setS(settings);
    const f = { units: settings.units, timezone: settings.timezone, nightscout_url: settings.nightscout_url || '', nightscout_token: '' };
    for (const t of THRESHOLDS) f[t.key] = toDisplay(settings[t.key], settings.units);
    setForm(f);
  }

  useEffect(() => {
    api.get('/api/diabetes/settings').then(fill).catch((e) => setError(e.message));
  }, []);

  if (!form) return error ? <div className="error-banner">{error}</div> : <p>Loading...</p>;

  const set = (k) => (e) => {
    setMessage('');
    const value = e.target.value;
    if (k === 'units') {
      // Convert the threshold inputs so switching units doesn't change the actual targets.
      setForm((p) => {
        const next = { ...p, units: value };
        for (const t of THRESHOLDS) next[t.key] = toDisplay(fromDisplay(p[t.key], p.units), value);
        return next;
      });
    } else {
      setForm((p) => ({ ...p, [k]: value }));
    }
  };

  async function save(e) {
    e.preventDefault();
    setError('');
    try {
      const body = { units: form.units, timezone: form.timezone, nightscout_url: form.nightscout_url || null, nightscout_token: form.nightscout_token };
      for (const t of THRESHOLDS) body[t.key] = fromDisplay(form[t.key], form.units);
      await api.put('/api/diabetes/settings', body);
      fill(await reloadDiabetesSettings());
      setMessage('Saved.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function clearToken() {
    await api.put('/api/diabetes/settings', { nightscout_token: null });
    fill(await reloadDiabetesSettings());
    setMessage('Token removed.');
  }

  function resetTargets() {
    setForm((p) => ({ ...p, very_low: toDisplay(54, p.units), target_low: toDisplay(70, p.units), target_high: toDisplay(180, p.units), very_high: toDisplay(250, p.units) }));
  }

  return (
    <div className="dm-page">
      <div className="page-header">
        <h2>Diabetes Settings</h2>
        <p>Units, target ranges and data connections.</p>
      </div>
      {error && <div className="error-banner">{error}</div>}
      <form onSubmit={save}>
        <section className="card">
          <h3 className="card-title">Glucose units & targets</h3>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="st-units">Units</label>
              <select id="st-units" value={form.units} onChange={set('units')}>
                <option value="mg/dL">mg/dL</option>
                <option value="mmol/L">mmol/L</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="st-tz">Timezone (for Nightscout sync)</label>
              <input id="st-tz" type="text" value={form.timezone} onChange={set('timezone')} />
            </div>
            {THRESHOLDS.map((t) => (
              <div className="form-field" key={t.key}>
                <label htmlFor={`st-${t.key}`}>{t.label} ({form.units})</label>
                <input id={`st-${t.key}`} type="number" step={form.units === 'mmol/L' ? '0.1' : '1'} value={form[t.key] ?? ''} onChange={set(t.key)} />
              </div>
            ))}
          </div>
          <p className="muted small">
            Defaults follow the international consensus ({toDisplay(70, form.units)}–{toDisplay(180, form.units)} target). Some people use a
            tighter range such as {toDisplay(70, form.units)}–{toDisplay(140, form.units)}.{' '}
            <button type="button" className="link-btn" onClick={resetTargets}>Reset to consensus defaults</button>
          </p>
        </section>

        <section className="card">
          <h3 className="card-title">Nightscout</h3>
          <div className="form-grid">
            <div className="form-field full">
              <label htmlFor="st-ns">Site URL</label>
              <input id="st-ns" type="url" placeholder="https://yoursite.example.com" value={form.nightscout_url} onChange={set('nightscout_url')} />
            </div>
            <div className="form-field full">
              <label htmlFor="st-nst">Access token or API secret {s.has_nightscout_token && '(saved; leave blank to keep it)'}</label>
              <input id="st-nst" type="password" autoComplete="off" value={form.nightscout_token} onChange={set('nightscout_token')} />
            </div>
          </div>
          <p className="muted small">
            Use a read-only token: in Nightscout, Admin Tools → Subjects → add one with the "readable" role. It is stored only in your local
            database. {s.has_nightscout_token && <button type="button" className="link-btn" onClick={clearToken}>Remove saved token</button>}
          </p>
        </section>

        <div className="form-actions">
          <button className="btn" type="submit">Save settings</button>
          {message && <span className="muted small" style={{ alignSelf: 'center' }}>{message}</span>}
        </div>
      </form>
    </div>
  );
}
