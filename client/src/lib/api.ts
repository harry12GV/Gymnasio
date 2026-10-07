/**
 * Cliente HTTP mínimo para la API de NEW START GYM.
 * Lee el token JWT de localStorage y lanza errores legibles.
 */

const TOKEN_KEY = 'nsg-token';

// En desarrollo el proxy de Vite resuelve /api; en producción configurar VITE_API_URL.
const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export interface ApiError {
  message: string;
}

/**
 * Handler global de sesión expirada: se registra desde auth.store.
 * Limpia el estado y redirige a /login cuando la API responde 401.
 */
type SessionExpiredHandler = () => void;
let onSessionExpired: SessionExpiredHandler | null = null;

export function setSessionExpiredHandler(handler: SessionExpiredHandler | null): void {
  onSessionExpired = handler;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

  const res = await fetch(`${BASE_URL}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    // 401 con sesión iniciada = token inválido/expirado → cerrar sesión.
    // Se excluye /auth/login para no limpiar el estado en un intento fallido.
    if (
      res.status === 401 &&
      onSessionExpired &&
      getToken() &&
      !path.startsWith('/auth/login') &&
      !path.startsWith('/auth/forgot-password') &&
      !path.startsWith('/auth/reset-password')
    ) {
      onSessionExpired();
    }
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    const error: ApiError = { message: body.error ?? `Error ${res.status}` };
    throw error;
  }

  return res.json() as Promise<T>;
}
