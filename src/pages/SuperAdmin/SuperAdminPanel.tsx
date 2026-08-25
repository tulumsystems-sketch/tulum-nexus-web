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

const getRoleLabel = (rol: string) => {
  if (rol === 'OPERADOR') return 'Operador (Caja)';
  if (rol === 'PREVENTISTA') return 'Preventista';
  if (rol === 'ADMIN') return 'Administrador';
  if (rol === 'SUPER_ADMIN') return 'Super Admin';
  return rol;
};

interface TenantConfig {
  id?: number;
  tenantId: string;
  nombreEmpresa?: string;
  activo: boolean;
  ivaPorcentaje?: number;
  pagoEfectivoHabilitado?: boolean;
  pagoTransferenciaHabilitado?: boolean;
  pagoMercadoPagoHabilitado?: boolean;
  aliasCobro?: string;
  clientesHabilitado?: boolean;
  remitosHabilitado?: boolean;
  comprasHabilitado?: boolean;
  stockHabilitado?: boolean;
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
    ivaPorcentaje: 21,
    pagoEfectivoHabilitado: true,
    pagoTransferenciaHabilitado: false,
    pagoMercadoPagoHabilitado: false,
    clientesHabilitado: true,
    remitosHabilitado: true,
    comprasHabilitado: true,
    stockHabilitado: true,
    aliasCobro: '',
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
  const whatsappBot = Array.isArray(featureData)
    ? featureData.find((feature) => feature.featureKey === 'WHATSAPP_BOT')
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

  const toggleFeature = async (featureKey: string, currentEnabled?: boolean) => {
    if (!effectiveTenantId || currentEnabled === undefined) return;
    setSavingFeature(featureKey);
    setFeedback(null);
    try {
      await apiClient.put(`/superadmin/tenants/${effectiveTenantId}/features/${featureKey}`, {
        enabled: !currentEnabled,
      });
      await mutateFeatures();
      setFeedback({
        type: 'success',
        message: `${featureKey} ${!currentEnabled ? 'habilitado' : 'deshabilitado'} para ${effectiveTenantId}.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || `No pudimos actualizar ${featureKey}.`,
      });
    } finally {
      setSavingFeature(null);
    }
  };

  const togglePosBarcode = async () => {
    await toggleFeature('POS_BARCODE', posBarcode?.enabled);
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
        ivaPorcentaje: Number(createForm.ivaPorcentaje),
        pagoEfectivoHabilitado: createForm.pagoEfectivoHabilitado,
        pagoTransferenciaHabilitado: createForm.pagoTransferenciaHabilitado,
        pagoMercadoPagoHabilitado: createForm.pagoMercadoPagoHabilitado,
        clientesHabilitado: createForm.clientesHabilitado,
        remitosHabilitado: createForm.remitosHabilitado,
        comprasHabilitado: createForm.comprasHabilitado,
        stockHabilitado: createForm.stockHabilitado,
        aliasCobro: createForm.aliasCobro.trim() || null,
      });

      await mutate();
      setSelectedTenantId(createForm.tenantId.trim().toLowerCase());
      setIsCreateModalOpen(false);
      setCreateForm({
        tenantId: '',
        nombreEmpresa: '',
        adminEmail: '',
        adminPassword: '',
        ivaPorcentaje: 21,
        pagoEfectivoHabilitado: true,
        pagoTransferenciaHabilitado: false,
        pagoMercadoPagoHabilitado: false,
        clientesHabilitado: true,
        remitosHabilitado: true,
        comprasHabilitado: true,
        stockHabilitado: true,
        aliasCobro: '',
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
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 flex items-center justify-between">
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

                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-black text-white">Pedidos por WhatsApp (WHATSAPP_BOT)</div>
                      <p className="mt-0.5 text-xs font-medium text-slate-400">
                        Permite que el bot externo cree pedidos con X-Bot-Secret. El tablero Pedidos funciona igual sin el bot.
                      </p>
                    </div>
                    <label className="flex cursor-pointer items-center gap-2">
                      <span className="text-xs font-bold text-slate-300">
                        {whatsappBot?.enabled ? 'Activo' : 'Inactivo'}
                      </span>
                      <input
                        type="checkbox"
                        checked={Boolean(whatsappBot?.enabled)}
                        onChange={() => toggleFeature('WHATSAPP_BOT', whatsappBot?.enabled ?? false)}
                        disabled={savingFeature === 'WHATSAPP_BOT'}
                        className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <div className="text-sm font-black text-white mb-2">IVA en ticket</div>
                    <select
                      value={tenantConfigData?.ivaPorcentaje ?? 21}
                      onChange={async (e) => {
                        if (!effectiveTenantId || !tenantConfigData) return;
                        setSavingModule('ivaPorcentaje');
                        try {
                          await apiClient.put(`/admin/tenants/${effectiveTenantId}/config`, {
                            ...tenantConfigData,
                            ivaPorcentaje: Number(e.target.value),
                          });
                          await mutateTenantConfig();
                        } finally {
                          setSavingModule(null);
                        }
                      }}
                      disabled={savingModule === 'ivaPorcentaje'}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white"
                    >
                      <option value={0}>0% (no discrimina IVA)</option>
                      <option value={10.5}>10.5%</option>
                      <option value={21}>21%</option>
                    </select>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                    <div className="text-sm font-black text-white">Medios de pago en el POS</div>
                    {[
                      ['pagoEfectivoHabilitado', 'Efectivo'],
                      ['pagoTransferenciaHabilitado', 'Transferencia'],
                      ['pagoMercadoPagoHabilitado', 'Mercado Pago'],
                    ].map(([key, label]) => (
                      <label key={key} className="flex items-center justify-between text-sm text-slate-300">
                        <span>{label}</span>
                        <input
                          type="checkbox"
                          checked={Boolean(tenantConfigData?.[key] ?? (key === 'pagoEfectivoHabilitado'))}
                          onChange={() => toggleTenantModule(key, Boolean(tenantConfigData?.[key] ?? (key === 'pagoEfectivoHabilitado')))}
                          disabled={savingModule === key}
                          className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-blue-600"
                        />
                      </label>
                    ))}
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
                                {getRoleLabel(u.rol)}
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
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
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
                <p className="text-xs text-slate-400 mt-0.5">Paquete comercial + admin inicial. El comercio no se da de alta solo.</p>
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
                  pattern="[a-z0-9][a-z0-9_-]{2,40}"
                  title="Minusculas, numeros, guion o guion bajo. 3 a 41 caracteres."
                  onChange={(e) => setCreateForm({ ...createForm, tenantId: e.target.value.toLowerCase() })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm font-medium font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">3 a 41 caracteres: minúsculas, números, guion o guion bajo. Sin espacios.</p>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                    IVA *
                  </label>
                  <select
                    value={createForm.ivaPorcentaje}
                    onChange={(e) => setCreateForm({ ...createForm, ivaPorcentaje: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm font-medium"
                  >
                    <option value={0}>0% (no discrimina)</option>
                    <option value={10.5}>10.5%</option>
                    <option value={21}>21%</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                    Alias / CBU (si cobra transferencia)
                  </label>
                  <input
                    type="text"
                    placeholder="alias.comercio"
                    value={createForm.aliasCobro}
                    onChange={(e) => setCreateForm({ ...createForm, aliasCobro: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 text-sm font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-2">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">Medios de pago</p>
                  <label className="flex items-center justify-between text-sm text-slate-200">
                    <span>Efectivo</span>
                    <input type="checkbox" checked={createForm.pagoEfectivoHabilitado} onChange={(e) => setCreateForm({ ...createForm, pagoEfectivoHabilitado: e.target.checked })} />
                  </label>
                  <label className="flex items-center justify-between text-sm text-slate-200">
                    <span>Transferencia</span>
                    <input type="checkbox" checked={createForm.pagoTransferenciaHabilitado} onChange={(e) => setCreateForm({ ...createForm, pagoTransferenciaHabilitado: e.target.checked })} />
                  </label>
                  <label className="flex items-center justify-between text-sm text-slate-200">
                    <span>Mercado Pago</span>
                    <input type="checkbox" checked={createForm.pagoMercadoPagoHabilitado} onChange={(e) => setCreateForm({ ...createForm, pagoMercadoPagoHabilitado: e.target.checked })} />
                  </label>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-2">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">Modulos</p>
                  <label className="flex items-center justify-between text-sm text-slate-200">
                    <span>Clientes</span>
                    <input type="checkbox" checked={createForm.clientesHabilitado} onChange={(e) => setCreateForm({ ...createForm, clientesHabilitado: e.target.checked })} />
                  </label>
                  <label className="flex items-center justify-between text-sm text-slate-200">
                    <span>Remitos</span>
                    <input type="checkbox" checked={createForm.remitosHabilitado} onChange={(e) => setCreateForm({ ...createForm, remitosHabilitado: e.target.checked })} />
                  </label>
                  <label className="flex items-center justify-between text-sm text-slate-200">
                    <span>Compras</span>
                    <input type="checkbox" checked={createForm.comprasHabilitado} onChange={(e) => setCreateForm({ ...createForm, comprasHabilitado: e.target.checked })} />
                  </label>
                  <label className="flex items-center justify-between text-sm text-slate-200">
                    <span>Stock</span>
                    <input type="checkbox" checked={createForm.stockHabilitado} onChange={(e) => setCreateForm({ ...createForm, stockHabilitado: e.target.checked })} />
                  </label>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-slate-300 space-y-1">
                <p className="font-black uppercase tracking-wider text-emerald-400">Entrega al comercio</p>
                <p>1. Pedir: nombre, slug, email admin, password temporal, IVA, medios de pago, módulos.</p>
                <p>2. Cargar acá y crear. El comercio queda activo.</p>
                <p>3. Entregar: URL de la app, slug (empresa), email y password. Ellos no salen de su tenant.</p>
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
                      minLength={8}
                      placeholder="Minimo 8 caracteres"
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
