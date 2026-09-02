import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../lib/AdminAuthContext';

export default function AdminGuard({ children }) {
  const { authed } = useAdminAuth();
  if (authed === null) return <div className="page-loading">Loading…</div>;
  if (!authed) return <Navigate to="/admin/login" replace />;
  return children;
}
