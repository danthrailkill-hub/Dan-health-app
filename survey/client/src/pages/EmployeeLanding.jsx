import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmployeeAuth } from '../lib/EmployeeAuthContext';

export default function EmployeeLanding() {
  const { login } = useEmployeeAuth();
  const navigate = useNavigate();
  const [employeeId, setEmployeeId] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!employeeId.trim()) {
      setError('Please enter your Employee ID.');
      return;
    }
    setSubmitting(true);
    try {
      const data = await login(employeeId.trim());
      if (data.alreadyCompleted) {
        navigate('/thank-you', { state: { alreadyCompleted: true } });
      } else {
        navigate('/survey');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="public-shell">
      <header className="public-header">
        <div>
          <strong>Ernst Concrete</strong>
          <div>
            <span>Employee Engagement Survey</span>
          </div>
        </div>
      </header>
      <main className="public-main">
        <div className="card">
          <h1>Welcome</h1>
          <p className="lead">
            Enter your Employee ID to begin. Your ID is used only to confirm you're an active
            Ernst Concrete employee.
          </p>
          {error && <div className="error-banner">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="employeeId">Employee ID</label>
              <input
                id="employeeId"
                type="text"
                inputMode="numeric"
                autoFocus
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="e.g. 10432"
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? 'Checking…' : 'Continue'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
