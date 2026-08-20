import axios, {
  InternalAxiosRequestConfig,
  AxiosError,
  AxiosResponse,
} from "axios";
import { clearSession } from "../utils/session";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8080/api";
const TOKEN_KEY = "token";
const LOGIN_PATH = "/login";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

const esLogin = (config: InternalAxiosRequestConfig): boolean => {
  const url = `${config.baseURL || ''}${config.url || ''}`;
  return url.includes('/auth/login');
};

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    if (esLogin(config)) return config;

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return config;

    config.headers.Authorization = `Bearer ${token}`;
    const tenant = localStorage.getItem('tenant');
    if (tenant) config.headers['X-Tenant-ID'] = tenant;
    return config;
  },
  (error: AxiosError): Promise<never> => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => response,
  (error: AxiosError): Promise<any> => {
    if (!error.response) return Promise.reject(error);
    // 401 = sesión inválida. 403 = autenticado pero sin permiso (ej. preventista vs caja),
    // salvo comercio inactivo: esa sesión no sirve y hay que salir.
    const errorBody = error.response.data as { error?: string } | undefined;
    if (error.response.status === 403 && errorBody?.error === 'Comercio inactivo') {
      clearSession();
      if (window.location.pathname !== LOGIN_PATH) {
        window.location.href = LOGIN_PATH;
      }
      return Promise.reject(error);
    }
    if (error.response.status === 401) {
      const currentPath = window.location.pathname;
      const token = localStorage.getItem('token');
      if (!token && currentPath !== '/login') {
        window.location.href = LOGIN_PATH;
      } else if (token && currentPath !== '/login') {
        clearSession();
        window.location.href = LOGIN_PATH;
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;