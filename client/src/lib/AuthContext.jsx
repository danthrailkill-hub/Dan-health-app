import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authed, setAuthed] = useState(null); // null = unknown, true/false once checked

  async function checkSession() {
    try {
      await api.get('/api/profile');
      setAuthed(true);
    } catch {
      setAuthed(false);
    }
  }

  useEffect(() => {
    checkSession();
  }, []);

  async function login(password) {
    await api.post('/api/auth/login', { password });
    setAuthed(true);
  }

  async function logout() {
    await api.post('/api/auth/logout', {});
    setAuthed(false);
  }

  return <AuthContext.Provider value={{ authed, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
