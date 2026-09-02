import { useLocation } from 'react-router-dom';

export default function ThankYou() {
  const location = useLocation();
  const alreadyCompleted = location.state?.alreadyCompleted;

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
          <h1>{alreadyCompleted ? "You've already completed this survey" : 'Thank you!'}</h1>
          <p className="lead">
            {alreadyCompleted
              ? 'Our records show you already submitted a response. Thanks for your feedback!'
              : 'Your response has been recorded. We appreciate you taking the time to share your feedback.'}
          </p>
        </div>
      </main>
    </div>
  );
}
