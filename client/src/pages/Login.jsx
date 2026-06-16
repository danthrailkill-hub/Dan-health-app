import { useState } from 'react';
import { useAuth } from '../lib/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(password);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-screen">
      <form className="login-box" onSubmit={handleSubmit}>
        <h1>My Health Record</h1>
        <p>Enter your password to view your medical information.</p>
        {error && <div className="error-banner">{error}</div>}
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Checking...' : 'Unlock'}
        </button>
      </form>
    </div>
  );
}
