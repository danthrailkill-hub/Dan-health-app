import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';

const EmployeeAuthContext = createContext(null);

export function EmployeeAuthProvider({ children }) {
  const [authed, setAuthed] = useState(null); // null = unknown, true/false once checked
  const [employee, setEmployee] = useState(null);

  async function checkSession() {
    try {
      const data = await api.get('/api/auth/employee/me');
      setEmployee(data.employee);
      setAuthed(true);
    } catch {
      setAuthed(false);
    }
  }

  useEffect(() => {
    checkSession();
  }, []);

  async function login(employeeId) {
    const data = await api.post('/api/auth/employee/login', { employeeId });
    setEmployee(data.employee);
    setAuthed(true);
    return data;
  }

  async function logout() {
    await api.post('/api/auth/employee/logout', {});
    setAuthed(false);
    setEmployee(null);
  }

  return (
    <EmployeeAuthContext.Provider value={{ authed, employee, login, logout }}>
      {children}
    </EmployeeAuthContext.Provider>
  );
}

export function useEmployeeAuth() {
  return useContext(EmployeeAuthContext);
}
