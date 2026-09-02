import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../lib/AdminAuthContext';

export default function AdminLayout() {
  const { logout } = useAdminAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/admin/login');
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div className="admin-header-title">
          <strong>Ernst Concrete</strong>
          <span>Engagement Survey Admin</span>
        </div>
        <nav className="admin-nav">
          <NavLink to="/admin/surveys" className={({ isActive }) => (isActive ? 'active' : '')}>
            Surveys
          </NavLink>
          <NavLink to="/admin/employees" className={({ isActive }) => (isActive ? 'active' : '')}>
            Employee Roster
          </NavLink>
        </nav>
        <button type="button" className="btn btn-ghost" onClick={handleLogout}>
          Log out
        </button>
      </header>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
