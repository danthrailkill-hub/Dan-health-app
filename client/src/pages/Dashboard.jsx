import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { schemas } from '../lib/schemas';

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
