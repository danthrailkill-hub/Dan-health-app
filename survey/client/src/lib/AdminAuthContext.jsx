import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [authed, setAuthed] = useState(null); // null = unknown, true/false once checked

  async function checkSession() {
    try {
      await api.get('/api/admin/surveys');
      setAuthed(true);
    } catch {
      setAuthed(false);
    }
  }

  useEffect(() => {
    checkSession();
  }, []);

  async function login(password) {
    await api.post('/api/auth/admin/login', { password });
    setAuthed(true);
  }

  async function logout() {
    await api.post('/api/auth/admin/logout', {});
    setAuthed(false);
  }

  return <AdminAuthContext.Provider value={{ authed, login, logout }}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}
