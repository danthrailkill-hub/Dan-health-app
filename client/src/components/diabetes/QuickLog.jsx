import { useState } from 'react';
import { api } from '../../lib/api';
import { EVENT_LABELS, fromDisplay, nowLocalInput } from '../../lib/glucose';

const TABS = [
  { key: 'glucose', label: 'Glucose' },
  { key: 'insulin', label: 'Insulin' },
  { key: 'carbs', label: 'Carbs' },
  { key: 'events', label: 'Event' },
];

const initial = () => ({
  ts: nowLocalInput(),
  value: '',
  source: 'meter',
  units: '',
  kind: 'bolus',
  insulin: '',
  grams: '',
  description: '',
  eventKind: 'exercise',
  duration_min: '',
  eventValue: '',
  note: '',
});

// Fast manual entry for fingersticks, doses, meals and events.
export default function QuickLog({ settings, onSaved, defaultTab = 'glucose' }) {
  const [tab, setTab] = useState(defaultTab);
  const [v, setV] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const set = (k) => (e) => setV((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    try {
      let body;
      if (tab === 'glucose') body = { ts: v.ts, mgdl: fromDisplay(v.value, settings.units), source: v.source, note: v.note };
      if (tab === 'insulin') body = { ts: v.ts, units: v.units, kind: v.kind, insulin: v.insulin, note: v.note };
      if (tab === 'carbs') body = { ts: v.ts, grams: v.grams, description: v.description };
      if (tab === 'events') body = { ts: v.ts, kind: v.eventKind, duration_min: v.duration_min, value: v.eventValue, note: v.note };
      await api.post(`/api/diabetes/${tab}`, body);
      setMessage('Saved.');
      setV((p) => ({ ...initial(), insulin: p.insulin, source: p.source, kind: p.kind }));
      onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card quicklog">
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={tab === t.key ? 'tab active' : 'tab'}
            onClick={() => {
              setTab(t.key);
              setError('');
              setMessage('');
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <form className="form-grid" onSubmit={submit}>
        {error && <div className="error-banner" style={{ gridColumn: '1 / -1' }}>{error}</div>}
        <div className="form-field">
          <label htmlFor="ql-ts">Date & time</label>
          <input id="ql-ts" type="datetime-local" value={v.ts} onChange={set('ts')} required />
        </div>

        {tab === 'glucose' && (
          <>
            <div className="form-field">
              <label htmlFor="ql-g">Glucose ({settings.units})</label>
              <input id="ql-g" type="number" inputMode="decimal" step={settings.units === 'mmol/L' ? '0.1' : '1'} value={v.value} onChange={set('value')} required autoFocus />
            </div>
            <div className="form-field">
              <label htmlFor="ql-src">Source</label>
              <select id="ql-src" value={v.source} onChange={set('source')}>
                <option value="meter">Fingerstick / meter</option>
                <option value="cgm">CGM reading</option>
              </select>
            </div>
          </>
        )}

        {tab === 'insulin' && (
          <>
            <div className="form-field">
              <label htmlFor="ql-u">Units</label>
              <input id="ql-u" type="number" inputMode="decimal" step="0.05" min="0" value={v.units} onChange={set('units')} required autoFocus />
            </div>
            <div className="form-field">
              <label htmlFor="ql-k">Type</label>
              <select id="ql-k" value={v.kind} onChange={set('kind')}>
                <option value="bolus">Meal bolus</option>
                <option value="correction">Correction</option>
                <option value="basal">Basal / long-acting</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="ql-name">Insulin (optional)</label>
              <input id="ql-name" type="text" placeholder="e.g. Humalog, Fiasp, Tresiba" value={v.insulin} onChange={set('insulin')} />
            </div>
          </>
        )}

        {tab === 'carbs' && (
          <>
            <div className="form-field">
              <label htmlFor="ql-c">Carbs (g)</label>
              <input id="ql-c" type="number" inputMode="numeric" min="1" value={v.grams} onChange={set('grams')} required autoFocus />
            </div>
            <div className="form-field">
              <label htmlFor="ql-d">What did you eat? (optional)</label>
              <input id="ql-d" type="text" value={v.description} onChange={set('description')} />
            </div>
          </>
        )}

        {tab === 'events' && (
          <>
            <div className="form-field">
              <label htmlFor="ql-ek">Event</label>
              <select id="ql-ek" value={v.eventKind} onChange={set('eventKind')}>
                {Object.entries(EVENT_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </div>
            {v.eventKind === 'exercise' && (
              <div className="form-field">
                <label htmlFor="ql-dur">Duration (minutes)</label>
                <input id="ql-dur" type="number" min="0" value={v.duration_min} onChange={set('duration_min')} />
              </div>
            )}
            {v.eventKind === 'ketones' && (
              <div className="form-field">
                <label htmlFor="ql-kv">Ketones (mmol/L)</label>
                <input id="ql-kv" type="number" step="0.1" min="0" value={v.eventValue} onChange={set('eventValue')} />
              </div>
            )}
          </>
        )}

        {tab !== 'carbs' && (
          <div className="form-field full">
            <label htmlFor="ql-note">Note (optional)</label>
            <input id="ql-note" type="text" value={v.note} onChange={set('note')} />
          </div>
        )}

        <div className="form-actions">
          <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Log it'}</button>
          {message && <span className="muted" style={{ alignSelf: 'center', fontSize: 13 }}>{message}</span>}
        </div>
      </form>
    </div>
  );
}
