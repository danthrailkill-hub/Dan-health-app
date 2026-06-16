import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

const CATEGORIES = [
  { key: 'supplements', label: 'Supplements' },
  { key: 'workouts', label: 'Workouts' },
  { key: 'diet', label: 'Diet' },
  { key: 'lifestyle', label: 'Lifestyle' },
];

export default function Recommendations() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/api/recommendations')
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <div className="error-banner">{error}</div>;

  const hasGoals = data.based_on.goals.length > 0;
  const hasRecs = CATEGORIES.some((c) => data.categories[c.key]?.length > 0);

  return (
    <div>
      <div className="page-header">
        <h2>Recommendations</h2>
        <p>Personalised supplement, workout, diet, and lifestyle suggestions based on your goals and medical context.</p>
      </div>

      {!hasGoals && (
        <div className="no-goals-banner">
          No goals set yet. <Link to="/goals">Add your goals</Link> to generate personalised recommendations.
        </div>
      )}

      {hasGoals && (
        <>
          <div className="rec-meta">
            Based on: <strong>{data.based_on.goals.join(', ')}</strong>
            {data.based_on.condition_count > 0 && (
              <> · {data.based_on.condition_count} condition{data.based_on.condition_count !== 1 ? 's' : ''} considered</>
            )}
            {data.based_on.medication_count > 0 && (
              <> · {data.based_on.medication_count} active medication{data.based_on.medication_count !== 1 ? 's' : ''} checked</>
            )}
          </div>

          {data.cautions.length > 0 && (
            <div className="caution-list">
              {data.cautions.map((c, i) => (
                <div key={i} className="caution-item">{c}</div>
              ))}
            </div>
          )}

          {!hasRecs && (
            <div className="empty-state">No recommendations matched your current goals. Try adding a recognised goal type.</div>
          )}

          {hasRecs && (
            <div className="rec-categories">
              {CATEGORIES.map((cat) => {
                const items = data.categories[cat.key];
                if (!items?.length) return null;
                return (
                  <div className="rec-category" key={cat.key}>
                    <h3>{cat.label}</h3>
                    <div className="rec-items">
                      {items.map((item, i) => (
                        <div className="rec-item" key={i}>
                          <div className="rec-title">{item.title}</div>
                          <div className="rec-detail">{item.detail}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="disclaimer-box">{data.disclaimer}</div>
        </>
      )}
    </div>
  );
}
