import { Routes, Route, Navigate } from 'react-router-dom';
import AdminGuard from './components/AdminGuard.jsx';
import AdminLayout from './components/AdminLayout.jsx';
import EmployeeLanding from './pages/EmployeeLanding.jsx';
import EmployeeSurvey from './pages/EmployeeSurvey.jsx';
import ThankYou from './pages/ThankYou.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import AdminSurveys from './pages/AdminSurveys.jsx';
import AdminEmployees from './pages/AdminEmployees.jsx';
import AdminSurveyEditor from './pages/AdminSurveyEditor.jsx';
import AdminResults from './pages/AdminResults.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<EmployeeLanding />} />
      <Route path="/survey" element={<EmployeeSurvey />} />
      <Route path="/thank-you" element={<ThankYou />} />

      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <AdminGuard>
            <AdminLayout />
          </AdminGuard>
        }
      >
        <Route index element={<Navigate to="surveys" replace />} />
        <Route path="surveys" element={<AdminSurveys />} />
        <Route path="surveys/:id" element={<AdminSurveyEditor />} />
        <Route path="surveys/:id/results" element={<AdminResults />} />
        <Route path="employees" element={<AdminEmployees />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
