import React, { useState } from 'react';
import useSWR from 'swr';
import { useForm, SubmitHandler } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import apiClient from '../../../api/axiosConfig';

const fetcher = (url: string) => apiClient.get(url).then((res) => res.data);

interface Usuario {
  id: number;
  email: string;
  rol: string;
}

interface CreateUserInputs {
  email: string;
  password: string;
  rol: string;
}

/**
 * Esquema de validación para el formulario de nuevo usuario (Yup)
 */
const userSchema = yup.object().shape({
  email: yup.string().email('Debe ser un correo válido').required('El correo es obligatorio'),
  password: yup.string().required('La contraseña es obligatoria').min(6, 'Debe tener al menos 6 caracteres'),
  rol: yup.string().required('El rol es obligatorio'),
});

export const UsuariosTab: React.FC = () => {
  const { data: usuarios, mutate, error, isLoading } = useSWR('/usuarios', fetcher);
  const [apiError, setApiError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateUserInputs>({
    resolver: yupResolver(userSchema),
    defaultValues: {
      rol: 'OPERADOR'
    }
  });

  /**
   * Maneja la creación de un nuevo usuario
   */
  const onSubmit: SubmitHandler<CreateUserInputs> = async (data) => {
    setApiError(null);
    try {
      await apiClient.post('/usuarios', data);
      reset();
      await mutate();
    } catch (err: any) {
      console.error(err);

      // Guard Clause: Extracción del mensaje o un error por defecto
      const errorMessage =
        err.response?.data?.message ||
        'Ocurrió un error al intentar crear el usuario.';

      setApiError(errorMessage);
    }
  };

  /**
   * Alternativa simple (toggle) entre roles
   */
  const toggleRol = async (usuario: Usuario) => {
    try {
      const newRol = usuario.rol === 'ADMIN' ? 'OPERADOR' : 'ADMIN';
      await apiClient.put(`/usuarios/${usuario.id}/rol`, { rol: newRol });
      await mutate();
    } catch (err: any) {
      console.error(err);
      alert('Error al cambiar el rol del usuario. ' + (err.response?.data?.message || ''));
    }
  };

  /**
   * Eliminación segura (con popup de confirmación)
   */
  const deleteUsuario = async (id: number) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) return;
    try {
      await apiClient.delete(`/usuarios/${id}`);
      await mutate();
    } catch (err: any) {
      console.error(err);
      alert('Error al eliminar el usuario. ' + (err.response?.data?.message || ''));
    }
  };

  // Renderizado del loader para la data principal
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <svg className="w-8 h-8 text-blue-500 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  // Rederizado de error grave
  if (error) {
    return <div className="p-4 text-red-500 bg-red-50 rounded-xl">Error al conectar con la base de datos de usuarios.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Formulario de Creación */}
      <section className="p-4 sm:p-6 bg-white border shadow-sm border-slate-200 rounded-2xl">
        <h3 className="mb-4 text-lg font-bold text-slate-800">Registrar Nuevo Usuario</h3>

        {apiError && (
          <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 border border-red-300 rounded-xl">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 md:space-y-0 md:flex md:gap-4 md:items-start">
          <div className="flex-1">
            <label className="block mb-1 text-xs font-bold tracking-wider uppercase text-slate-500">Email</label>
            <input
              type="email"
              {...register('email')}
              className={`w-full px-4 py-2.5 text-sm font-semibold transition-all border rounded-xl text-slate-700 bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white ${errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-200'
                }`}
              placeholder="ej. email@empresa.com"
            />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div className="flex-1">
            <label className="block mb-1 text-xs font-bold tracking-wider uppercase text-slate-500">Contraseña</label>
            <input
              type="password"
              {...register('password')}
              className={`w-full px-4 py-2.5 text-sm font-semibold transition-all border rounded-xl text-slate-700 bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white ${errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-200'
                }`}
              placeholder="••••••••"
            />
            {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
          </div>

          <div className="flex-1">
            <label className="block mb-1 text-xs font-bold tracking-wider uppercase text-slate-500">Rol</label>
            <select
              {...register('rol')}
              className={`w-full px-4 py-2.5 text-sm font-semibold transition-all border rounded-xl text-slate-700 bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white ${errors.rol ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-200'
                }`}
            >
              <option value="OPERADOR">OPERADOR</option>
              <option value="ADMIN">ADMIN</option>
            </select>
            {errors.rol && <p className="mt-1 text-xs text-red-500">{errors.rol.message}</p>}
          </div>

          <div className="flex items-end md:w-32">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-4 py-2.5 text-sm font-bold text-white transition-all bg-blue-600 shadow-sm md:mt-6 rounded-xl hover:bg-blue-700 hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none"
            >
              {isSubmitting ? 'Guardando...' : 'Crear'}
            </button>
          </div>
        </form>
      </section>

      {/* Tabla de Usuarios */}
      <section className="overflow-hidden bg-white border shadow-sm rounded-2xl border-slate-200">
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b bg-slate-50 border-slate-200">
          <h3 className="text-lg font-bold text-slate-800">Usuarios del Tenant</h3>
          <span className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-100 rounded-full">
            {Array.isArray(usuarios) ? usuarios.length : 0} Registrados
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left text-slate-600">
            <thead className="text-xs font-bold tracking-wider uppercase bg-white border-b border-slate-100 text-slate-400">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4 text-center">Rol</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Array.isArray(usuarios) && usuarios.length > 0 ? (
                usuarios.map((usuario: Usuario, index: number) => (
                  <tr key={usuario.id} className={`transition-colors hover:bg-slate-50 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                    <td className="px-6 py-4 font-mono text-slate-400">{usuario.id}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">{usuario.email}</td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border shadow-sm ${usuario.rol === 'ADMIN'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                      >
                        {usuario.rol}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => toggleRol(usuario)}
                          className="px-3 py-1.5 text-xs font-bold text-indigo-600 transition-colors bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-600 hover:text-white"
                          title="Cambiar Rol"
                        >
                          Cambiar Rol
                        </button>
                        <button
                          onClick={() => deleteUsuario(usuario.id)}
                          className="px-3 py-1.5 text-xs font-bold text-red-500 transition-colors bg-white border border-red-200 rounded-lg hover:bg-red-50"
                          title="Eliminar Usuario"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 italic text-center text-slate-400">
                    No hay usuarios registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
