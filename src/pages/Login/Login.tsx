import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import apiClient from '../../api/axiosConfig';
import { homePathForRol } from '../../utils/session';
import { AppButton } from '../../components/ui/AppButton';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { fieldClass, labelClass } from '../../components/ui/fieldStyles';

export interface LoginFormInputs {
  tenant: string;
  email: string;
  password: string;
}

const loginSchema: yup.ObjectSchema<LoginFormInputs> = yup.object().shape({
  tenant: yup.string().required('El comercio es obligatorio.'),
  email: yup.string().email('Debe ser un correo válido.').required('El usuario es obligatorio.'),
  password: yup.string().required('La contraseña es obligatoria.'),
});

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

  const onSubmit: SubmitHandler<LoginFormInputs> = async (data) => {
    setApiError(null);
    try {
      const response = await apiClient.post('/auth/login', {
        tenant: data.tenant.trim(),
        email: data.email.trim(),
        password: data.password,
      });

      const { token, rol, tenant, email, userId, inactividadMinutos } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('tenant', tenant);
      localStorage.setItem('rol', rol);
      localStorage.setItem('email', email);
      if (userId != null) localStorage.setItem('userId', String(userId));
      localStorage.setItem('inactividadMinutos', String(inactividadMinutos || 30));
      localStorage.setItem('tulum_last_activity', String(Date.now()));

      navigate(homePathForRol(rol));
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Credenciales incorrectas o error de conexión con el servidor.';
      setApiError(errorMsg);
    }
  };

  const inputError = (invalid: boolean) =>
    `${fieldClass} ${invalid ? 'border-tulum-danger focus:border-tulum-danger focus:ring-tulum-danger/20' : ''}`;

  return (
    <div className="tulum-app min-h-screen bg-tulum-ink flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-tulum-border bg-tulum-surface p-8">
        <p className="text-[11px] font-medium text-tulum-muted">Tulum Core</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-tulum-bone">Ingresar</h1>

        {apiError && (
          <div className="mt-5">
            <ErrorAlert message={apiError} />
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div>
            <label className={labelClass}>Comercio</label>
            <input
              type="text"
              {...register('tenant')}
              className={inputError(Boolean(errors.tenant))}
              placeholder="ej. mi-empresa"
              disabled={isSubmitting}
              autoComplete="organization"
            />
            {errors.tenant && (
              <p className="mt-1.5 text-xs text-tulum-danger">{errors.tenant.message}</p>
            )}
          </div>

          <div>
            <label className={labelClass}>Usuario</label>
            <input
              type="email"
              {...register('email')}
              className={inputError(Boolean(errors.email))}
              placeholder="usuario@empresa.com"
              disabled={isSubmitting}
              autoComplete="username"
            />
            {errors.email && (
              <p className="mt-1.5 text-xs text-tulum-danger">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className={labelClass}>Contraseña</label>
            <input
              type="password"
              {...register('password')}
              className={inputError(Boolean(errors.password))}
              placeholder="••••••••"
              disabled={isSubmitting}
              autoComplete="current-password"
            />
            {errors.password && (
              <p className="mt-1.5 text-xs text-tulum-danger">{errors.password.message}</p>
            )}
          </div>

          <AppButton type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Verificando…' : 'Ingresar'}
          </AppButton>
        </form>
      </div>
    </div>
  );
};
