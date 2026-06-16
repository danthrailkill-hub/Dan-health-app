import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Documents from './pages/Documents';
import Recommendations from './pages/Recommendations';
import RecordsPage from './pages/RecordsPage';

function App() {
  const { authed } = useAuth();

  if (authed === null) {
    return <p style={{ padding: 40 }}>Loading...</p>;
  }

  if (!authed) {
    return <Login />;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/recommendations" element={<Recommendations />} />
        <Route path="/goals" element={<RecordsPage table="goals" />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/conditions" element={<RecordsPage table="conditions" />} />
        <Route path="/medications" element={<RecordsPage table="medications" />} />
        <Route path="/allergies" element={<RecordsPage table="allergies" />} />
        <Route path="/immunizations" element={<RecordsPage table="immunizations" />} />
        <Route path="/labs" element={<RecordsPage table="labs" />} />
        <Route path="/visits" element={<RecordsPage table="visits" />} />
        <Route path="/contacts" element={<RecordsPage table="contacts" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
