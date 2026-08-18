import axios, {
  InternalAxiosRequestConfig,
  AxiosError,
  AxiosResponse,
} from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8080/api";
const TOKEN_KEY = "token";
const LOGIN_PATH = "/login";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
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
    // 401 = sesión inválida. 403 = autenticado pero sin permiso (ej. preventista vs caja).
    if (error.response.status === 401) {
      const currentPath = window.location.pathname;
      const token = localStorage.getItem('token');
      if (!token && currentPath !== '/login') {
        window.location.href = LOGIN_PATH;
      } else if (token && currentPath !== '/login') {
        localStorage.removeItem('token');
        localStorage.removeItem('tenant');
        localStorage.removeItem('rol');
        localStorage.removeItem('email');
        window.location.href = LOGIN_PATH;
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;