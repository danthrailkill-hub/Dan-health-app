import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { schemas } from '../lib/schemas';
import { fmtG, fmtPct, fmtTime, fmtDate, rangeColor, RANGES, classify } from '../lib/glucose';

function GlucoseSnapshot() {
  const [summary, setSummary] = useState(null);
  const [latest, setLatest] = useState(null);
  useEffect(() => {
    api.get('/api/diabetes/summary?days=14').then(setSummary).catch(() => {});
    api.get('/api/diabetes/latest').then((r) => setLatest(r.glucose)).catch(() => {});
  }, []);
  if (!summary) return null;
  const s = summary.settings;
  const st = summary.stats;
  if (!st.count && !latest) {
    return (
      <Link to="/diabetes" className="card glucose-snapshot">
        <div><strong>Type 1 Diabetes</strong></div>
        <div className="muted small">No glucose data yet. Import from Dexcom, Libre or Nightscout, or start logging.</div>
      </Link>
    );
  }
  const range = latest ? RANGES.find((r) => r.key === classify(latest.mgdl, s)) : null;
  return (
    <Link to="/diabetes" className="card glucose-snapshot">
      {latest && (
        <div className="snap-latest">
          <div className="label">Latest glucose</div>
          <div className="value">
            <span className="swatch" style={{ background: rangeColor(latest.mgdl, s) }} />
            {fmtG(latest.mgdl, s.units)} <span className="small muted">{s.units}</span>
          </div>
          <div className="small muted">{range.label} · {fmtDate(latest.ts.slice(0, 10))} {fmtTime(latest.ts)}</div>
        </div>
      )}
      <div className="snap-stats">
        <div><div className="label">Time in range (14d)</div><div className="value">{fmtPct(st.ranges.in_range)}</div></div>
        <div><div className="label">GMI</div><div className="value">{fmtPct(st.gmi, 1)}</div></div>
        <div><div className="label">Lows (14d)</div><div className="value">{st.low_episodes}</div></div>
      </div>
      <div className="snap-cta">Open diabetes overview →</div>
    </Link>
  );
}

const TABLES = Object.keys(schemas).filter((t) => t !== 'goals');

export default function Dashboard() {
  const [counts, setCounts] = useState({});
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    api.get('/api/profile').then(setProfile).catch(() => {});
    Promise.all(
      TABLES.map((table) =>
        api
          .get(`/api/${table}`)
          .then((rows) => [table, rows.length])
          .catch(() => [table, 0])
      )
    ).then((entries) => setCounts(Object.fromEntries(entries)));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h2>{profile?.full_name ? `${profile.full_name}'s Health Record` : 'Your Health Record'}</h2>
        <p>An overview of everything you've recorded.</p>
      </div>
      <GlucoseSnapshot />
      <div style={{ marginBottom: 20 }}>
        <Link
          to="/recommendations"
          style={{
            display: 'inline-block',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: 'var(--radius)',
            padding: '12px 20px',
            fontWeight: 600,
            fontSize: 14,
            color: 'var(--primary-dark)',
          }}
        >
          ✦ View my recommendations →
        </Link>
      </div>
      <div className="dashboard-grid">
        {TABLES.map((table) => (
          <Link key={table} to={`/${table}`} className="summary-card">
            <div className="count">{counts[table] ?? '–'}</div>
            <div className="label">{schemas[table].title}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
