import axios, {
  InternalAxiosRequestConfig,
  AxiosError,
  AxiosResponse,
} from "axios";

// Constantes de configuración para mantener el código limpio y mantenible
const API_BASE_URL = "http://localhost:8080/api";
const TOKEN_KEY = "token";
const LOGIN_PATH = "/login";

/**
 * Instancia global de Axios configurada para las peticiones al backend multi-tenant (Tulum Core).
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Request Interceptor
 *
 * Se encarga de buscar el JWT en el almacenamiento local e inyectarlo en
 * los headers de cada petición saliente para la autenticación y validación de tenant.
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = localStorage.getItem(TOKEN_KEY);

    // Guard Clause: Si no hay token, retornamos la configuración sin modificar
    if (!token) {
      return config;
    }

    // Inyectamos el header de autorización
    config.headers.Authorization = `Bearer ${token}`;

    const tenant = localStorage.getItem('tenant');
    if (tenant) {
      config.headers['X-Tenant-ID'] = tenant;
    }

    return config;
  },
  (error: AxiosError): Promise<never> => {
    return Promise.reject(error);
  },
);

/**
 * Response Interceptor
 *
 * Evalúa la respuesta del servidor. Si existe un error de autorización (401 o 403),
 * procede a eliminar el token local inválido o caducado, y redirige al usuario al login.
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => {
    // Retornamos la respuesta exitosa directamente
    return response;
  },
  (error: AxiosError): Promise<never> => {
    // Guard Clause: Nos aseguramos de que el error tenga una respuesta del servidor
    if (!error.response) {
      return Promise.reject(error);
    }

    const statusCode = error.response.status;
    const isUnauthorized = statusCode === 401 || statusCode === 403;

    if (isUnauthorized) {
      const currentPath = window.location.pathname;
      const token = localStorage.getItem('token');
      
      // Solo redirigir si no hay token Y no estamos ya en login
      if (!token && currentPath !== '/login') {
        window.location.href = LOGIN_PATH;
      } else if (token && currentPath !== '/login') {
        // Hay token pero el request falló — limpiar y redirigir
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
