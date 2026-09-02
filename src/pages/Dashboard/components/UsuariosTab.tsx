import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import { useForm, SubmitHandler } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import apiClient from '../../../api/axiosConfig';
import { useTenantFeatures } from '../../../hooks/useTenantFeatures';

const fetcher = (url: string) => apiClient.get(url).then((res) => res.data);

const ROLES_TODOS = ['OPERADOR', 'PREVENTISTA', 'ADMIN', 'REPARTIDOR'] as const;
type RolAsignable = (typeof ROLES_TODOS)[number];

const getRoleLabel = (rol: string, esRestaurante: boolean) => {
  if (esRestaurante) {
    if (rol === 'OPERADOR') return 'Caja';
    if (rol === 'ADMIN') return 'Socio';
    if (rol === 'REPARTIDOR') return 'Delivery';
  }
  if (rol === 'OPERADOR') return 'Operador (Caja)';
  if (rol === 'PREVENTISTA') return 'Preventista';
  if (rol === 'ADMIN') return 'Administrador';
  if (rol === 'REPARTIDOR') return 'Repartidor';
  return rol;
};

interface Usuario {
  id: number;
  email: string;
  rol: string;
  telefono?: string;
}

interface CreateUserInputs {
  email?: string;
  password?: string;
  rol: RolAsignable;
  telefono?: string;
}

const userSchema = yup.object().shape({
  rol: yup.string().oneOf([...ROLES_TODOS], 'Rol invalido').required('El rol es obligatorio'),
  email: yup
    .string()
    .transform((v) => (v === '' ? undefined : v))
    .email('Debe ser un correo válido')
    .when('rol', {
      is: 'REPARTIDOR',
      then: (s) => s.optional(),
      otherwise: (s) => s.required('El correo es obligatorio'),
    }),
  password: yup
    .string()
    .transform((v) => (v === '' ? undefined : v))
    .when('rol', {
      is: 'REPARTIDOR',
      then: (s) => s.min(6, 'Debe tener al menos 6 caracteres').optional(),
      otherwise: (s) => s.required('La contraseña es obligatoria').min(6, 'Debe tener al menos 6 caracteres'),
    }),
  telefono: yup.string().when('rol', {
    is: 'REPARTIDOR',
    then: (s) => s.test(
      'cadete-contacto',
      'WhatsApp, o email y contraseña para entrar a /salida',
      function (value) {
        const { email, password } = this.parent;
        if (value && String(value).trim()) return true;
        return Boolean(email && password && String(password).length >= 6);
      }
    ),
    otherwise: (s) => s.optional(),
  }),
});

export const UsuariosTab: React.FC = () => {
  const { data: usuarios, mutate, error, isLoading } = useSWR('/usuarios', fetcher);
  const { data: globalConfig } = useSWR('/config', fetcher);
  const { isFeatureEnabled } = useTenantFeatures();
  const [apiError, setApiError] = useState<string | null>(null);
  const esRestaurante = isFeatureEnabled('MESAS') || (Boolean(globalConfig) && globalConfig.remitosHabilitado === false);
  const rolesAsignables = useMemo(
    () => (esRestaurante ? ['OPERADOR', 'ADMIN', 'REPARTIDOR'] : ['OPERADOR', 'PREVENTISTA', 'ADMIN', 'REPARTIDOR']),
    [esRestaurante]
  );

  const getRolSiguiente = (rol: string) => {
    const indice = rolesAsignables.indexOf(rol);
    if (indice < 0) return rolesAsignables[0];
    return rolesAsignables[(indice + 1) % rolesAsignables.length];
  };

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<CreateUserInputs>({
    resolver: yupResolver(userSchema) as any,
    defaultValues: {
      rol: 'OPERADOR',
      email: '',
      password: '',
      telefono: '',
    }
  });
  const rolActual = watch('rol');

  /**
   * Maneja la creación de un nuevo usuario
   */
  const onSubmit: SubmitHandler<CreateUserInputs> = async (data) => {
    setApiError(null);
    if (!rolesAsignables.includes(data.rol)) {
      setApiError('Rol inválido para este comercio.');
      return;
    }
    try {
      await apiClient.post('/usuarios', {
        ...data,
        email: data.email || undefined,
        password: data.password || undefined,
        telefono: data.telefono || undefined,
      });
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
      const newRol = getRolSiguiente(usuario.rol);
      await apiClient.put(`/usuarios/${usuario.id}/rol`, { rol: newRol });
      await mutate();
    } catch (err: any) {
      console.error(err);
      alert('Error al cambiar el rol del usuario. ' + (err.response?.data?.message || ''));
    }
  };

  const setTelefono = async (usuario: Usuario) => {
    const valor = window.prompt(
      esRestaurante
        ? (usuario.rol === 'ADMIN'
          ? 'WhatsApp del Socio (Fogo abre el panel de operación, no el de cliente)'
          : usuario.rol === 'OPERADOR'
            ? 'WhatsApp de Caja (salón y turno, no cliente)'
            : 'WhatsApp de Delivery (ej. 11 1234-5678)')
        : usuario.rol === 'ADMIN'
          ? 'WhatsApp del administrador'
          : usuario.rol === 'REPARTIDOR'
            ? 'WhatsApp del cadete (ej. 11 1234-5678)'
            : 'WhatsApp',
      usuario.telefono || ''
    );
    if (valor == null) return;
    try {
      await apiClient.put(`/usuarios/${usuario.id}/telefono`, { telefono: valor });
      await mutate();
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo guardar el WhatsApp.');
    }
  };

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
            <label className="block mb-1 text-xs font-bold tracking-wider uppercase text-slate-500">WhatsApp</label>
            <input
              type="tel"
              {...register('telefono')}
              className={`w-full px-4 py-2.5 text-sm font-semibold transition-all border rounded-xl text-slate-700 bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white ${errors.telefono ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-200'
                }`}
              placeholder="11 1234-5678"
            />
            {errors.telefono && <p className="mt-1 text-xs text-red-500">{errors.telefono.message}</p>}
          </div>

          <div className="flex-1">
            <label className="block mb-1 text-xs font-bold tracking-wider uppercase text-slate-500">Contraseña</label>
            <input
              type="password"
              {...register('password')}
              className={`w-full px-4 py-2.5 text-sm font-semibold transition-all border rounded-xl text-slate-700 bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white ${errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-200'
                }`}
              placeholder={rolActual === 'REPARTIDOR' ? 'Opcional si tiene WhatsApp; si entra a /salida, email + clave' : '••••••••'}
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
              <option value="OPERADOR">{esRestaurante ? 'Caja' : 'Operador (Caja)'}</option>
              {!esRestaurante && <option value="PREVENTISTA">Preventista</option>}
              <option value="ADMIN">{esRestaurante ? 'Socio' : 'Administrador'}</option>
              <option value="REPARTIDOR">{esRestaurante ? 'Delivery' : 'Repartidor'}</option>
            </select>
            {errors.rol && <p className="mt-1 text-xs text-red-500">{errors.rol.message}</p>}
            {rolActual === 'REPARTIDOR' ? (
              <p className="mt-1 text-xs font-semibold text-slate-400">
                {esRestaurante
                  ? 'Delivery se maneja por WhatsApp. Email y clave solo si entra a /salida.'
                  : 'El cadete puede entrar a /salida con email y contraseña. El WhatsApp queda opcional.'}
              </p>
            ) : rolActual === 'ADMIN' ? (
              <p className="mt-1 text-xs font-semibold text-slate-400">
                {esRestaurante
                  ? 'Si cargás WhatsApp, Fogo abre el panel de Socio (caja, mesas, cocina, stock). No el de cliente.'
                  : 'Si cargás WhatsApp, Fogo te abre el panel de dueño (no el de cliente).'}
              </p>
            ) : rolActual === 'OPERADOR' && esRestaurante ? (
              <p className="mt-1 text-xs font-semibold text-slate-400">
                Si cargás WhatsApp, Fogo abre el panel de Caja: salón, cocina y esperado. Sin ventas del día ni stock.
              </p>
            ) : rolActual === 'PREVENTISTA' ? (
              <p className="mt-1 text-xs font-semibold text-slate-400">
                El preventista no accede al punto de venta.
              </p>
            ) : null}
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
                <th className="px-6 py-4">WhatsApp</th>
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
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">
                      {usuario.telefono || '—'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border shadow-sm ${usuario.rol === 'ADMIN'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : usuario.rol === 'PREVENTISTA'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : usuario.rol === 'REPARTIDOR'
                                ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                      >
                        {getRoleLabel(usuario.rol, esRestaurante)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setTelefono(usuario)}
                          className="px-3 py-1.5 text-xs font-bold text-cyan-700 transition-colors bg-cyan-50 border border-cyan-100 rounded-lg hover:bg-cyan-600 hover:text-white"
                          title="WhatsApp para el bot"
                        >
                          WhatsApp
                        </button>
                        <button
                          onClick={() => toggleRol(usuario)}
                          className="px-3 py-1.5 text-xs font-bold text-indigo-600 transition-colors bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-600 hover:text-white"
                          title={`Cambiar a ${getRoleLabel(getRolSiguiente(usuario.rol), esRestaurante)}`}
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
                    <td colSpan={5} className="px-6 py-8 italic text-center text-slate-400">
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
