import { createContext, useCallback, useContext, useMemo, useState } from 'react';

// "user_details" in sessionStorage is the key the original app used; keeping it means existing
// sessions and any other code reading it keep working.
const KEY = 'user_details';
const AuthContext = createContext(null);

const read = () => {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || 'null');
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(read);

  const login = useCallback((profile, token) => {
    if (token) sessionStorage.setItem('th_token', token);
    sessionStorage.setItem(KEY, JSON.stringify(profile));
    setUser(profile);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(KEY);
    sessionStorage.removeItem('th_token');
    setUser(null);
  }, []);

  const update = useCallback((patch) => {
    setUser((prev) => {
      const next = { ...prev, ...patch };
      sessionStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo(() => ({ user, login, logout, update }), [user, login, logout, update]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export const homeFor = (user) => {
  if (user?.role === 'ADMIN') return '/admin';
  if (user?.role === 'THEATER_OWNER') return '/owner';
  return '/';
};

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('') || 'U';
