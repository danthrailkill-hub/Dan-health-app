import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useEmployeeAuth } from '../lib/EmployeeAuthContext';

function LikertQuestion({ question, value, onChange }) {
  const labels = ['1 - Strongly Disagree', '2 - Disagree', '3 - Neutral', '4 - Agree', '5 - Strongly Agree'];
  return (
    <div className="likert-row">
      {[1, 2, 3, 4, 5].map((n) => (
        <div
          key={n}
          className={`likert-option ${value === String(n) ? 'selected' : ''}`}
          onClick={() => onChange(question.id, String(n))}
        >
          {labels[n - 1]}
        </div>
      ))}
    </div>
  );
}

function SingleChoiceQuestion({ question, value, onChange }) {
  return (
    <div>
      {question.options.map((opt) => (
        <label key={opt} className="choice-option">
          <input
            type="radio"
            name={`q-${question.id}`}
            checked={value === opt}
            onChange={() => onChange(question.id, opt)}
          />
          {opt}
        </label>
      ))}
    </div>
  );
}

function MultiChoiceQuestion({ question, value, onChange }) {
  const selected = Array.isArray(value) ? value : [];
  function toggle(opt) {
    if (selected.includes(opt)) {
      onChange(question.id, selected.filter((o) => o !== opt));
    } else {
      onChange(question.id, [...selected, opt]);
    }
  }
  return (
    <div>
      {question.options.map((opt) => (
        <label key={opt} className="choice-option">
          <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} />
          {opt}
        </label>
      ))}
    </div>
  );
}

function TextQuestion({ question, value, onChange }) {
  return (
    <textarea
      value={value || ''}
      onChange={(e) => onChange(question.id, e.target.value)}
      placeholder="Type your response…"
    />
  );
}

export default function EmployeeSurvey() {
  const { authed, employee } = useEmployeeAuth();
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, error: '', survey: null, questions: [] });
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (authed === false) {
      navigate('/');
      return;
    }
    if (authed !== true) return;

    api
      .get('/api/survey/current')
      .then((data) => {
        if (data.alreadyCompleted) {
          navigate('/thank-you', { state: { alreadyCompleted: true } });
          return;
        }
        setState({ loading: false, error: '', survey: data.survey, questions: data.questions });
      })
      .catch((err) => {
        setState({ loading: false, error: err.message, survey: null, questions: [] });
      });
  }, [authed, navigate]);

  function setAnswer(questionId, value) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError('');
    setSubmitting(true);
    try {
      await api.post(`/api/survey/${state.survey.id}/submit`, { answers });
      navigate('/thank-you');
    } catch (err) {
      setSubmitError(err.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  }

  if (authed === null || state.loading) {
    return <div className="page-loading">Loading survey…</div>;
  }

  return (
    <div className="public-shell">
      <header className="public-header">
        <div>
          <strong>Ernst Concrete</strong>
          <div>
            <span>{employee ? `Hi ${employee.firstName}, ` : ''}Employee Engagement Survey</span>
          </div>
        </div>
      </header>
      <main className="public-main">
        <div className="card" style={{ maxWidth: 720 }}>
          {state.error ? (
            <>
              <h1>Survey unavailable</h1>
              <div className="error-banner">{state.error}</div>
            </>
          ) : (
            <>
              <h1>{state.survey.title}</h1>
              {state.survey.description && <p className="lead">{state.survey.description}</p>}
              {submitError && <div className="error-banner">{submitError}</div>}
              <form onSubmit={handleSubmit}>
                {state.questions.map((q, i) => {
                  const showSectionHeader = q.section && q.section !== state.questions[i - 1]?.section;
                  return (
                    <div key={q.id}>
                      {showSectionHeader && (
                        <h2
                          style={{
                            fontSize: '1.05rem',
                            color: 'var(--navy)',
                            marginTop: i === 0 ? 0 : 32,
                            marginBottom: 4,
                            paddingBottom: 8,
                            borderBottom: '1px solid var(--gray-200)',
                          }}
                        >
                          {q.section}
                        </h2>
                      )}
                      <div className="question">
                        <div className="question-prompt">
                          {q.prompt}
                          {q.required && <span className="required-mark">*</span>}
                        </div>
                        {q.type === 'likert5' && (
                          <LikertQuestion question={q} value={answers[q.id]} onChange={setAnswer} />
                        )}
                        {q.type === 'single_choice' && (
                          <SingleChoiceQuestion question={q} value={answers[q.id]} onChange={setAnswer} />
                        )}
                        {q.type === 'multi_choice' && (
                          <MultiChoiceQuestion question={q} value={answers[q.id]} onChange={setAnswer} />
                        )}
                        {q.type === 'text' && (
                          <TextQuestion question={q} value={answers[q.id]} onChange={setAnswer} />
                        )}
                      </div>
                    </div>
                  );
                })}
                <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit Survey'}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
