import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import apiClient from '../../api/axiosConfig';

/**
 * Interfaces
 */
export interface LoginFormInputs {
  tenant: string;
  email: string;
  password: string;
}

/**
 * Validación Declarativa (Yup) - Separada del componente UI
 */
const loginSchema: yup.ObjectSchema<LoginFormInputs> = yup.object().shape({
  tenant: yup.string().required('El nombre de la Empresa (Tenant) es obligatorio.'),
  email: yup.string().email('Debe ser un correo electrónico válido.').required('El correo electrónico es obligatorio.'),
  password: yup.string().required('La contraseña es obligatoria.'),
});

/**
 * Componente Login
 * Implementado usando Functional Hooks y React Hook Form conforme a las reglas.
 */
export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormInputs>({
    resolver: yupResolver(loginSchema),
  });

  /**
   * Manejador central del submit
   */
  const onSubmit: SubmitHandler<LoginFormInputs> = async (data) => {
    // Limpiamos errores previos (Happy path configuration)
    setApiError(null);

    try {
      // Petición POST al endpoint de autenticación Multi-Tenant
      const response = await apiClient.post('/auth/login', {
        email: data.email,
        password: data.password,
        tenant: data.tenant,
      });

      // Guard Clause: Validación temprana de respuesta
      const token = response.data?.token || response.data;
      if (!token || typeof token !== 'string') {
        setApiError('Respuesta inesperada del servidor. No se recibió el token.');
        return;
      }

      // Almacenamos el JWT devuelto por el servidor
      localStorage.setItem('token', token);

      // Redirección al Dashboard
      navigate('/dashboard');
    } catch (error: any) {
      console.error("DETALLE DEL ERROR:", error);

      // Guard Clause: Manejo explicito de la falta de red/servidor caído
      if (!error.response) {
        setApiError('No se pudo conectar con el servidor Tulum Core.');
        return;
      }

      // Guard Clause: Manejo de HTTP 401 Credenciales Inválidas
      if (error.response.status === 401) {
        setApiError('Credenciales incorrectas');
        return;
      }

      // Guard Clause: Manejo de HTTP 404 No Encontrado
      if (error.response.status === 404) {
        setApiError('Servidor no encontrado');
        return;
      }

      // Extracción del mensaje o un error por defecto
      const errorMessage =
        error.response.data?.message ||
        'Ocurrió un error al intentar iniciar sesión.';

      setApiError(errorMessage);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <h2 className="mb-2 text-2xl font-bold text-center text-gray-800">
          Tulum Core
        </h2>
        <p className="mb-6 text-sm text-center text-gray-500">
          Ingresa tus credenciales y entorno empresarial
        </p>

        {apiError && (
          <div
            className="p-3 mb-4 text-sm text-red-700 bg-red-100 border border-red-300 rounded"
            role="alert"
          >
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Campo: Empresa (Tenant) */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Empresa (Tenant ID) *
            </label>
            <input
              type="text"
              {...register('tenant')}
              className={`w-full px-4 py-2 text-gray-700 border rounded focus:outline-none focus:ring-2 ${
                errors.tenant ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
              }`}
              placeholder="ej. mi-empresa"
              disabled={isSubmitting}
            />
            {errors.tenant && (
              <p className="mt-1 text-xs text-red-500">{errors.tenant.message}</p>
            )}
          </div>

          {/* Campo: Email */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Correo Electrónico *
            </label>
            <input
              type="email"
              {...register('email')}
              className={`w-full px-4 py-2 text-gray-700 border rounded focus:outline-none focus:ring-2 ${
                errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
              }`}
              placeholder="usuario@empresa.com"
              disabled={isSubmitting}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>

          {/* Campo: Password */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Contraseña *
            </label>
            <input
              type="password"
              {...register('password')}
              className={`w-full px-4 py-2 text-gray-700 border rounded focus:outline-none focus:ring-2 ${
                errors.password ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
              }`}
              placeholder="••••••••"
              disabled={isSubmitting}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
            )}
          </div>

          {/* Botón de Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-4 py-2 font-bold text-white transition-colors bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Verificando...' : 'Iniciar Sesión en Nexus'}
          </button>
        </form>
      </div>
    </div>
  );
};
