import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import { AdminAuthProvider } from './lib/AdminAuthContext.jsx';
import { EmployeeAuthProvider } from './lib/EmployeeAuthContext.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AdminAuthProvider>
        <EmployeeAuthProvider>
          <App />
        </EmployeeAuthProvider>
      </AdminAuthProvider>
    </BrowserRouter>
  </StrictMode>
);
