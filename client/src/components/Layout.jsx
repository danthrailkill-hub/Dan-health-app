import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard' },
  { to: '/profile', label: 'Profile' },
  { to: '/conditions', label: 'Conditions' },
  { to: '/medications', label: 'Medications' },
  { to: '/allergies', label: 'Allergies' },
  { to: '/immunizations', label: 'Immunizations' },
  { to: '/labs', label: 'Lab Results' },
  { to: '/visits', label: 'Doctor Visits' },
  { to: '/contacts', label: 'Contacts' },
  { to: '/documents', label: 'Documents' },
];

export default function Layout() {
  const { logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1>My Health Record</h1>
        <nav>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button className="logout-btn" onClick={logout}>
          Log out
        </button>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
