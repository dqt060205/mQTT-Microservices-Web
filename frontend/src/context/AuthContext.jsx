import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api';
import { getToken, setToken } from '../api/token';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  // Restore the session on page load
  useEffect(() => {
    if (!getToken()) return;
    api.me().then(setUser).catch(() => setToken(null)).finally(() => setLoading(false));
  }, []);

  const finish = useCallback(async ({ token, user: u }) => {
    setToken(token);
    setUser(u ?? (await api.me()));
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      signIn: async (email, password) => finish(await api.login(email, password)),
      signUp: async (data) => finish(await api.register(data)),
      signOut: () => { setToken(null); setUser(null); },
    }),
    [user, loading, finish],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
