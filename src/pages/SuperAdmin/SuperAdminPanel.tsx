import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Building2, LogOut, RefreshCw, ShieldCheck, Plus, X, Users, Power, Mail, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/axiosConfig';
import { AppButton } from '../../components/ui/AppButton';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { LoadingState } from '../../components/ui/LoadingState';
import { StatusPill } from '../../components/ui/StatusPill';
import { clearTenantFeaturesCache } from '../../hooks/useTenantFeatures';

const fetcher = (url: string) => apiClient.get(url).then((res) => res.data);

interface TenantConfig {
  id?: number;
  tenantId: string;
  nombreEmpresa?: string;
  activo: boolean;
}

interface TenantFeature {
  featureKey: string;
  enabled: boolean;
  configurationJson?: string | null;
}

interface TenantUser {
  id: number;
  email: string;
  rol: string;
}

export const SuperAdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const { data, error, isLoading, mutate } = useSWR<TenantConfig[]>('/admin/tenants', fetcher);
  const tenants = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [savingFeature, setSavingFeature] = useState<string | null>(null);
  const [savingModule, setSavingModule] = useState<string | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal Crear Tenant
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingTenant, setIsCreatingTenant] = useState(false);
  const [createForm, setCreateForm] = useState({
    tenantId: '',
    nombreEmpresa: '',
    adminEmail: '',
    adminPassword: '',
  });

  const effectiveTenantId = selectedTenantId || tenants[0]?.tenantId || '';
  const selectedTenant = tenants.find((tenant) => tenant.tenantId === effectiveTenantId) || null;

  const {
    data: tenantConfigData,
    mutate: mutateTenantConfig,
  } = useSWR<any>(
    effectiveTenantId ? `/admin/tenants/${effectiveTenantId}/config` : null,
    fetcher,
  );

  const {
    data: featureData,
    error: featureError,
    isLoading: isLoadingFeatures,
    mutate: mutateFeatures,
  } = useSWR<TenantFeature[]>(
    effectiveTenantId ? `/superadmin/tenants/${effectiveTenantId}/features` : null,
    fetcher,
  );

  const {
    data: usersData,
    isLoading: isLoadingUsers,
    mutate: mutateUsers,
  } = useSWR<TenantUser[]>(
    effectiveTenantId ? `/admin/tenants/${effectiveTenantId}/usuarios` : null,
    fetcher,
  );

  const posBarcode = Array.isArray(featureData)
    ? featureData.find((feature) => feature.featureKey === 'POS_BARCODE')
    : null;

  const logout = () => {
    localStorage.clear();
    clearTenantFeaturesCache();
    navigate('/login', { replace: true });
  };

  const refresh = async () => {
    await mutate();
    await mutateTenantConfig();
    await mutateFeatures();
    await mutateUsers();
  };

  const toggleTenantModule = async (moduleKey: string, currentValue: boolean) => {
    if (!effectiveTenantId || !tenantConfigData) return;
    setSavingModule(moduleKey);
    setFeedback(null);
    try {
      const updatedConfig = {
        ...tenantConfigData,
        [moduleKey]: !currentValue,
      };
      await apiClient.put(`/admin/tenants/${effectiveTenantId}/config`, updatedConfig);
      await mutateTenantConfig();
      setFeedback({
        type: 'success',
        message: `Módulo ${moduleKey} ${!currentValue ? 'habilitado' : 'deshabilitado'} para ${effectiveTenantId}.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'No pudimos actualizar el módulo.',
      });
    } finally {
      setSavingModule(null);
    }
  };

  const toggleTenantStatus = async () => {
    if (!selectedTenant) return;
    setIsTogglingStatus(true);
    setFeedback(null);
    try {
      await apiClient.put(`/admin/tenants/${selectedTenant.tenantId}/status`, {
        activo: !selectedTenant.activo,
      });
      await mutate();
      setFeedback({
        type: 'success',
        message: `Tenant ${selectedTenant.tenantId} ${!selectedTenant.activo ? 'activado' : 'pausado'} correctamente.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'No pudimos cambiar el estado del tenant.',
      });
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const togglePosBarcode = async () => {
    if (!effectiveTenantId || !posBarcode) return;
    setSavingFeature('POS_BARCODE');
    setFeedback(null);
    try {
      await apiClient.put(`/superadmin/tenants/${effectiveTenantId}/features/POS_BARCODE`, {
        enabled: !posBarcode.enabled,
      });
      await mutateFeatures();
      setFeedback({
        type: 'success',
        message: `POS_BARCODE ${!posBarcode.enabled ? 'habilitado' : 'deshabilitado'} para ${effectiveTenantId}.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'No pudimos actualizar POS_BARCODE.',
      });
    } finally {
      setSavingFeature(null);
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setIsCreatingTenant(true);

    try {
      await apiClient.post('/admin/tenants', {
        tenantId: createForm.tenantId.trim().toLowerCase(),
        nombreEmpresa: createForm.nombreEmpresa.trim(),
        adminEmail: createForm.adminEmail.trim(),
        adminPassword: createForm.adminPassword,
      });

      await mutate();
      setSelectedTenantId(createForm.tenantId.trim().toLowerCase());
      setIsCreateModalOpen(false);
      setCreateForm({
        tenantId: '',
        nombreEmpresa: '',
        adminEmail: '',
        adminPassword: '',
      });

      setFeedback({
        type: 'success',
        message: `Empresa "${createForm.nombreEmpresa}" creada exitosamente. Ya puedes iniciar sesión con su admin.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.response?.data?.error || 'Error al crear la empresa.',
      });
    } finally {
      setIsCreatingTenant(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950 px-5 py-4 shadow-2xl shadow-black/20">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-400/25 bg-blue-500/15 text-blue-200">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-300">Gestion interna</p>
              <h1 className="text-2xl font-black tracking-tight text-white">Tulum Core Admin</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill label="SUPER ADMIN" tone="indigo" />
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/30 text-sm transition-all"
            >
              <Plus className="h-4 w-4" />
              Nueva Empresa
            </button>
            <AppButton variant="secondary" icon={RefreshCw} onClick={refresh}>
              Refrescar
            </AppButton>
            <AppButton variant="danger" icon={LogOut} onClick={logout}>
              Salir
            </AppButton>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-5 py-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        {/* Columna Izquierda: Lista de Tenants */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/25">
          <div className="border-b border-slate-800 px-5 py-4 flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-black text-white">
                <Building2 className="h-5 w-5 text-blue-300" />
                Empresas (Tenants)
              </h2>
              <p className="mt-1 text-xs font-medium text-slate-400">Selecciona para administrar features y accesos.</p>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="p-2 bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white rounded-xl transition-all border border-slate-700"
              title="Crear Nueva Empresa"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="p-4">
            {isLoading ? (
              <LoadingState label="Cargando tenants..." />
            ) : error ? (
              <ErrorAlert message="No pudimos cargar los tenants." />
            ) : tenants.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 text-sm font-semibold text-slate-400 text-center">
                <p className="mb-3">No hay tenants configurados.</p>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-500"
                >
                  + Crear Primer Tenant
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {tenants.map((tenant) => (
                  <button
                    key={tenant.tenantId}
                    type="button"
                    onClick={() => setSelectedTenantId(tenant.tenantId)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      effectiveTenantId === tenant.tenantId
                        ? 'border-blue-400/40 bg-blue-500/15'
                        : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-black text-white">{tenant.nombreEmpresa || tenant.tenantId}</div>
                        <div className="mt-1 font-mono text-xs text-slate-500">{tenant.tenantId}</div>
                      </div>
                      <StatusPill label={tenant.activo ? 'Activo' : 'Pausado'} tone={tenant.activo ? 'emerald' : 'red'} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Columna Derecha: Detalle de Tenant */}
        <section className="space-y-6">
          {feedback && <ErrorAlert type={feedback.type} message={feedback.message} />}

          {selectedTenant ? (
            <div className="space-y-6">
              {/* Header Tenant */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/25 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-white">{selectedTenant.nombreEmpresa || selectedTenant.tenantId}</h2>
                  <p className="mt-1 font-mono text-xs text-slate-400">ID del Tenant: <span className="text-blue-400 font-bold">{selectedTenant.tenantId}</span></p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusPill label={selectedTenant.activo ? 'ACTIVO' : 'PAUSADO'} tone={selectedTenant.activo ? 'emerald' : 'red'} />
                  <button
                    onClick={toggleTenantStatus}
                    disabled={isTogglingStatus}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      selectedTenant.activo
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white'
                    }`}
                  >
                    <Power className="h-3.5 w-3.5" />
                    {selectedTenant.activo ? 'Pausar Tenant' : 'Activar Tenant'}
                  </button>
                </div>
              </div>

              {/* Módulos y Feature Flags */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/25 p-6">
                <div className="mb-4 text-xs font-black uppercase tracking-wide text-slate-400">
                  Módulos y Funcionalidades Activas
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Módulo Clientes */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-black text-white">Módulo Clientes & Preventistas</div>
                      <p className="mt-0.5 text-xs font-medium text-slate-400">
                        Directorio de clientes, cuentas corrientes y geolocalización Maps.
                      </p>
                    </div>
                    <label className="flex cursor-pointer items-center gap-2">
                      <span className="text-xs font-bold text-slate-300">
                        {tenantConfigData?.clientesHabilitado ? 'Activo' : 'Inactivo'}
                      </span>
                      <input
                        type="checkbox"
                        checked={Boolean(tenantConfigData?.clientesHabilitado ?? true)}
                        onChange={() => toggleTenantModule('clientesHabilitado', Boolean(tenantConfigData?.clientesHabilitado ?? true))}
                        disabled={savingModule === 'clientesHabilitado'}
                        className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                  </div>

                  {/* Módulo Remitos */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-black text-white">Módulo Hojas de Ruta & Remitos</div>
                      <p className="mt-0.5 text-xs font-medium text-slate-400">
                        Despachos, viajes e indicaciones de reparto logístico.
                      </p>
                    </div>
                    <label className="flex cursor-pointer items-center gap-2">
                      <span className="text-xs font-bold text-slate-300">
                        {tenantConfigData?.remitosHabilitado ? 'Activo' : 'Inactivo'}
                      </span>
                      <input
                        type="checkbox"
                        checked={Boolean(tenantConfigData?.remitosHabilitado ?? true)}
                        onChange={() => toggleTenantModule('remitosHabilitado', Boolean(tenantConfigData?.remitosHabilitado ?? true))}
                        disabled={savingModule === 'remitosHabilitado'}
                        className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                  </div>

                  {/* Módulo Compras */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-black text-white">Módulo Compras & Proveedores</div>
                      <p className="mt-0.5 text-xs font-medium text-slate-400">
                        Órdenes de compra a proveedores e ingresos de mercadería.
                      </p>
                    </div>
                    <label className="flex cursor-pointer items-center gap-2">
                      <span className="text-xs font-bold text-slate-300">
                        {tenantConfigData?.comprasHabilitado ? 'Activo' : 'Inactivo'}
                      </span>
                      <input
                        type="checkbox"
                        checked={Boolean(tenantConfigData?.comprasHabilitado ?? true)}
                        onChange={() => toggleTenantModule('comprasHabilitado', Boolean(tenantConfigData?.comprasHabilitado ?? true))}
                        disabled={savingModule === 'comprasHabilitado'}
                        className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                  </div>

                  {/* Módulo Stock */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-black text-white">Módulo Stock & Movimientos</div>
                      <p className="mt-0.5 text-xs font-medium text-slate-400">
                        Kardex de movimientos y trazabilidad del inventario.
                      </p>
                    </div>
                    <label className="flex cursor-pointer items-center gap-2">
                      <span className="text-xs font-bold text-slate-300">
                        {tenantConfigData?.stockHabilitado ? 'Activo' : 'Inactivo'}
                      </span>
                      <input
                        type="checkbox"
                        checked={Boolean(tenantConfigData?.stockHabilitado ?? true)}
                        onChange={() => toggleTenantModule('stockHabilitado', Boolean(tenantConfigData?.stockHabilitado ?? true))}
                        disabled={savingModule === 'stockHabilitado'}
                        className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                  </div>

                  {/* Feature: Barcode */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 flex items-center justify-between md:col-span-2">
                    <div>
                      <div className="text-sm font-black text-white">Lector de Código de Barras (POS_BARCODE)</div>
                      <p className="mt-0.5 text-xs font-medium text-slate-400">
                        Búsqueda y escaneo rápido con lector de códigos de barra en el POS.
                      </p>
                    </div>
                    <label className="flex cursor-pointer items-center gap-2">
                      <span className="text-xs font-bold text-slate-300">
                        {posBarcode?.enabled ? 'Activo' : 'Inactivo'}
                      </span>
                      <input
                        type="checkbox"
                        checked={Boolean(posBarcode?.enabled)}
                        onChange={togglePosBarcode}
                        disabled={!posBarcode || savingFeature === 'POS_BARCODE'}
                        className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Usuarios del Tenant */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/25 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-400">
                    <Users className="h-4 w-4 text-blue-400" />
                    Usuarios Registrados en este Tenant
                  </div>
                  <span className="text-xs font-bold text-slate-500">
                    {Array.isArray(usersData) ? usersData.length : 0} usuarios
                  </span>
                </div>

                {isLoadingUsers ? (
                  <LoadingState label="Cargando usuarios..." />
                ) : Array.isArray(usersData) && usersData.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="min-w-full text-left text-sm text-slate-300">
                      <thead className="border-b border-slate-800 bg-slate-950 text-xs font-black uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-4 py-3">ID</th>
                          <th className="px-4 py-3">Email</th>
                          <th className="px-4 py-3 text-center">Rol</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 bg-slate-950/50">
                        {usersData.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-900/60">
                            <td className="px-4 py-3 font-mono text-xs text-slate-500">{u.id}</td>
                            <td className="px-4 py-3 font-bold text-white flex items-center gap-2">
                              <Mail className="h-3.5 w-3.5 text-slate-500" />
                              {u.email}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2.5 py-1 text-[11px] font-black rounded-lg uppercase tracking-wider ${
                                u.rol === 'ADMIN'
                                  ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                                  : u.rol === 'SUPER_ADMIN'
                                  ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                                  : 'bg-slate-800 text-slate-400'
                              }`}>
                                {u.rol}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-950 rounded-xl text-center text-sm text-slate-500">
                    No hay usuarios registrados en este tenant.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">
              Selecciona un tenant para ver sus features y usuarios.
            </div>
          )}
        </section>
      </main>

      {/* MODAL CREAR NUEVO TENANT */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Crear Nueva Empresa / Tenant</h3>
                <p className="text-xs text-slate-400 mt-0.5">Genera el tenant y su cuenta de administrador inicial.</p>
              </div>
            </div>

            <form onSubmit={handleCreateTenant} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  ID del Tenant (Identificador único) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej: distribuidora-bebidas"
                  value={createForm.tenantId}
                  onChange={(e) => setCreateForm({ ...createForm, tenantId: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm font-medium font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">Solo letras minúsculas, números y guiones. Sin espacios.</p>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Nombre Comercial de la Empresa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej: Distribuidora Central de Bebidas"
                  value={createForm.nombreEmpresa}
                  onChange={(e) => setCreateForm({ ...createForm, nombreEmpresa: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm font-medium"
                />
              </div>

              <div className="border-t border-slate-800 pt-4 mt-2">
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4" /> Administrador Inicial del Tenant
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                      Email del Administrador *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="admin@distribuidora.com"
                      value={createForm.adminEmail}
                      onChange={(e) => setCreateForm({ ...createForm, adminEmail: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                      Contraseña del Administrador *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="••••••••"
                      value={createForm.adminPassword}
                      onChange={(e) => setCreateForm({ ...createForm, adminPassword: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-3 text-slate-400 hover:text-white font-bold text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingTenant}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/30 text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isCreatingTenant ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" /> Creando Empresa...
                    </>
                  ) : (
                    'Crear Empresa'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
