import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, fileUrl } from '../lib/api';

const LIKERT_LABELS = { 1: 'Strongly Disagree', 2: 'Disagree', 3: 'Neutral', 4: 'Agree', 5: 'Strongly Agree' };

function LikertBreakdown({ counts, answered }) {
  return (
    <div>
      {[1, 2, 3, 4, 5].map((n) => {
        const count = counts[n] || 0;
        const pct = answered ? Math.round((count / answered) * 100) : 0;
        return (
          <div className="bar" key={n}>
            <div className="bar-label">{LIKERT_LABELS[n]}</div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="bar-count">{count}</div>
          </div>
        );
      })}
    </div>
  );
}

function ChoiceBreakdown({ counts, answered }) {
  const entries = Object.entries(counts);
  return (
    <div>
      {entries.map(([option, count]) => {
        const pct = answered ? Math.round((count / answered) * 100) : 0;
        return (
          <div className="bar" key={option}>
            <div className="bar-label">{option}</div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="bar-count">{count}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminResults() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/api/admin/surveys/${id}/results`)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) return <div className="error-banner">{error}</div>;
  if (!data) return <p>Loading…</p>;

  const responseRate = data.activeEmployeeCount
    ? Math.round((data.responseCount / data.activeEmployeeCount) * 100)
    : 0;

  return (
    <div>
      <Link className="link-back" to="/admin/surveys">
        ← Back to surveys
      </Link>

      <div className="section-header" style={{ marginTop: 12 }}>
        <h1>{data.survey.title} — Results</h1>
        <a className="btn btn-secondary" href={fileUrl(`/api/admin/surveys/${id}/export.csv`)}>
          Export CSV
        </a>
      </div>

      <div className="stat-grid">
        <div className="stat-tile">
          <div className="value">{data.responseCount}</div>
          <div className="label">Responses</div>
        </div>
        <div className="stat-tile">
          <div className="value">{data.activeEmployeeCount}</div>
          <div className="label">Active Employees</div>
        </div>
        <div className="stat-tile">
          <div className="value">{responseRate}%</div>
          <div className="label">Response Rate</div>
        </div>
      </div>

      {data.questions.map((q) => (
        <div className="panel" key={q.id}>
          <h2 style={{ marginTop: 0, fontSize: '1rem' }}>{q.prompt}</h2>
          <p className="hint" style={{ marginBottom: 14 }}>
            {q.answered} response{q.answered === 1 ? '' : 's'}
            {q.type === 'likert5' && q.average !== null ? ` · average ${q.average.toFixed(2)} / 5` : ''}
          </p>
          {q.type === 'likert5' && <LikertBreakdown counts={q.counts} answered={q.answered} />}
          {(q.type === 'single_choice' || q.type === 'multi_choice') && (
            <ChoiceBreakdown counts={q.counts} answered={q.answered} />
          )}
          {q.type === 'text' && (
            <div>
              {q.responses.length === 0 && <p className="hint">No responses yet.</p>}
              {q.responses.map((r, i) => (
                <div className="text-response" key={i}>
                  {r}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
