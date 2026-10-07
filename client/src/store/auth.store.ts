import { create } from 'zustand';
import { api, setToken, setSessionExpiredHandler } from '@/lib/api';

export type Role = 'SUPER_ADMIN' | 'RECEPTION' | 'MEMBER';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const USER_KEY = 'nsg-user';

function loadUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

/**
 * Se dispara cuando la API responde 401 con un token en localStorage
 * (token inválido o expirado): limpia la sesión y vuelve al login.
 * El handler es global y estático: no hace falta re-registrarlo tras el login,
 * y api() no lo dispara si no hay token (evita bucles con el propio login).
 */
function clearSessionAndRedirect(): void {
  setToken(null);
  localStorage.removeItem(USER_KEY);
  useAuthStore.setState({ user: null });
  if (!window.location.pathname.startsWith('/login')) {
    window.location.replace('/login?expired=1');
  }
}

setSessionExpiredHandler(clearSessionAndRedirect);

export const useAuthStore = create<AuthState>((set) => ({
  user: loadUser(),
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const data = await api<{ token: string; user: AuthUser }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setToken(data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      set({ user: data.user, loading: false });
    } catch (e) {
      const err = e as { message?: string };
      set({ loading: false, error: err.message ?? 'Error al iniciar sesión' });
      throw e;
    }
  },

  logout: () => {
    setToken(null);
    localStorage.removeItem(USER_KEY);
    set({ user: null });
  },
}));
