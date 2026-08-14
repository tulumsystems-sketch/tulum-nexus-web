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
      // Pasamos el header X-Tenant-ID manualmente porque aún no está en localStorage
      const response = await apiClient.post('/auth/login', {
        email: data.email,
        password: data.password,
        tenant: data.tenant,
      }, {
        headers: {
          'X-Tenant-ID': data.tenant
        }
      });

      const token = response.data?.token;
      const rol = response.data?.rol;
      const email = response.data?.email;

      if (!token || typeof token !== 'string') {
        setApiError('Respuesta inesperada del servidor.');
        return;
      }

      localStorage.setItem('token', token);
      localStorage.setItem('tenant', data.tenant);
      localStorage.setItem('rol', rol || 'OPERADOR');
      localStorage.setItem('email', email || '');

      // Pequeño delay para que localStorage se propague antes del redirect
      await new Promise(resolve => setTimeout(resolve, 100));
      navigate(rol === 'SUPER_ADMIN' ? '/admin' : '/dashboard');
    } catch (error: any) {

      // Guard Clause: Manejo explicito de la falta de red/servidor caído
      if (!error.response) {
        setApiError('No pudimos conectar con el servidor. Revisa que el backend este activo.');
        return;
      }

      // Guard Clause: Manejo de HTTP 401 Credenciales Inválidas
      if (error.response.status === 401) {
        setApiError('Credenciales incorrectas. Revisa email, password y tenant.');
        return;
      }

      // Guard Clause: Manejo de HTTP 404 No Encontrado
      if (error.response.status === 404) {
        setApiError('No encontramos el servicio de autenticacion.');
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
    <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center relative overflow-hidden px-4">
      {/* Glow effect behind panel */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="w-full max-w-md bg-[#111622] border border-gray-800 rounded-2xl shadow-2xl p-8 relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src="/lOGO tuLUM.png" alt="Tulum" className="h-16 w-auto object-contain" />
        </div>
        
        <h2 className="mb-2 text-2xl font-bold text-center text-white">
          Tulum Core
        </h2>
        <p className="mb-6 text-sm text-center text-gray-400">
          Ingresa con tu usuario y tenant empresarial
        </p>

        {apiError && (
          <div
            className="p-3 mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg"
            role="alert"
          >
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Campo: Empresa (Tenant) */}
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-300">
              Empresa (Tenant ID) *
            </label>
            <input
              type="text"
              {...register('tenant')}
              className={`w-full px-4 py-2.5 bg-[#0B0F19] border rounded-lg focus:outline-none focus:ring-1 transition-all text-white placeholder-gray-500 ${
                errors.tenant ? 'border-red-500 focus:ring-red-500' : 'border-gray-700 focus:border-emerald-500 focus:ring-emerald-500/20'
              }`}
              placeholder="ej. mi-empresa"
              disabled={isSubmitting}
            />
            {errors.tenant && (
              <p className="mt-1.5 text-xs text-red-400">{errors.tenant.message}</p>
            )}
          </div>

          {/* Campo: Email */}
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-300">
              Correo Electrónico *
            </label>
            <input
              type="email"
              {...register('email')}
              className={`w-full px-4 py-2.5 bg-[#0B0F19] border rounded-lg focus:outline-none focus:ring-1 transition-all text-white placeholder-gray-500 ${
                errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-700 focus:border-emerald-500 focus:ring-emerald-500/20'
              }`}
              placeholder="usuario@empresa.com"
              disabled={isSubmitting}
            />
            {errors.email && (
              <p className="mt-1.5 text-xs text-red-400">{errors.email.message}</p>
            )}
          </div>

          {/* Campo: Password */}
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-300">
              Contraseña *
            </label>
            <input
              type="password"
              {...register('password')}
              className={`w-full px-4 py-2.5 bg-[#0B0F19] border rounded-lg focus:outline-none focus:ring-1 transition-all text-white placeholder-gray-500 ${
                errors.password ? 'border-red-500 focus:ring-red-500' : 'border-gray-700 focus:border-emerald-500 focus:ring-emerald-500/20'
              }`}
              placeholder="••••••••"
              disabled={isSubmitting}
            />
            {errors.password && (
              <p className="mt-1.5 text-xs text-red-400">{errors.password.message}</p>
            )}
          </div>

          {/* Botón de Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-4 py-2.5 font-bold text-white transition-all bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-lg hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20"
          >
            {isSubmitting ? 'Verificando...' : 'Ingresar a Tulum Core'}
          </button>
        </form>
      </div>
    </div>
  );
};
