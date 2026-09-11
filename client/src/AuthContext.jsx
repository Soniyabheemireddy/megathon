import { createContext, useContext, useEffect, useState } from 'react';
import { api, clearToken, getToken, setToken } from './api';
import { roleHome } from './roles';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function boot() {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const data = await api('/auth/me');
        setUser(data.user);
      } catch {
        clearToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    boot();
  }, []);

  async function login(email, password, role) {
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, role })
    });
    setToken(data.token);
    setUser(data.user);
    return { ...data.user, home: data.home || roleHome(data.user.role) };
  }

  async function signup(payload) {
    const data = await api('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    setToken(data.token);
    setUser(data.user);
    return { ...data.user, home: data.home || roleHome(data.user.role) };
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
