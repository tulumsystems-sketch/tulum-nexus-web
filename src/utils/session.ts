export const homePathForRol = (rol?: string | null): string => {
  if (rol === 'SUPER_ADMIN') return '/admin';
  if (rol === 'REPARTIDOR') return '/salida';
  return '/dashboard';
};

const TOKEN_KEY = 'token';
const LAST_ACTIVITY_KEY = 'tulum_last_activity';
const IDLE_MINUTES_KEY = 'inactividadMinutos';
const LOGIN_PATH = '/login';

export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('tenant');
  localStorage.removeItem('rol');
  localStorage.removeItem('email');
  localStorage.removeItem('userId');
  localStorage.removeItem(IDLE_MINUTES_KEY);
  localStorage.removeItem(LAST_ACTIVITY_KEY);
};

export const getIdleMinutes = (): number => {
  const raw = Number(localStorage.getItem(IDLE_MINUTES_KEY));
  return Number.isFinite(raw) && raw > 0 ? raw : 30;
};

export const touchSessionActivity = () => {
  localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
};

export const jwtExpirationMs = (token: string | null): number | null => {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

export const isSessionExpired = (): boolean => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return true;

  const exp = jwtExpirationMs(token);
  if (exp && Date.now() >= exp) return true;

  const last = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0);
  if (!last) return false;
  return Date.now() - last >= getIdleMinutes() * 60 * 1000;
};

export const forceLogoutToLogin = () => {
  clearSession();
  if (window.location.pathname !== LOGIN_PATH) {
    window.location.href = LOGIN_PATH;
  }
};
