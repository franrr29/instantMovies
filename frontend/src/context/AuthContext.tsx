import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AUTH_LOGOUT_EVENT, api } from '../services/api';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // al montar, restaura la sesion contra la cookie httpOnly (si existe y es
  // valida); si el server responde 401 el usuario simplemente queda deslogueado
  useEffect(() => {
    let cancelled = false;

    api
      .get<{ user: User }>('/auth/me')
      .then((response) => {
        if (!cancelled) setUser(response.data.user);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // lo dispara el interceptor de services/api.ts ante cualquier 401
  useEffect(() => {
    function handleAuthLogout() {
      setUser(null);
      navigate('/login');
    }

    window.addEventListener(AUTH_LOGOUT_EVENT, handleAuthLogout);
    return () => window.removeEventListener(AUTH_LOGOUT_EVENT, handleAuthLogout);
  }, [navigate]);

  async function login(username: string, password: string) {
    const response = await api.post<{ user: User }>('/auth/login', { username, password });
    setUser(response.data.user);
  }

  async function register(username: string, password: string) {
    const response = await api.post<{ user: User }>('/auth/register', { username, password });
    setUser(response.data.user);
  }

  async function logout() {
    await api.post('/auth/logout');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }

  return context;
}
