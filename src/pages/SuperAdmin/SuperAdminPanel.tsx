import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  Building2,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Plus,
  X,
  Users,
  Power,
  Mail,
  Search,
  Flame,
  Truck,
  ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/axiosConfig';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { AppButton } from '../../components/ui/AppButton';
import { StatusPill } from '../../components/ui/StatusPill';
import { fieldClass, labelClass } from '../../components/ui/fieldStyles';
import { clearTenantFeaturesCache } from '../../hooks/useTenantFeatures';

const fetcher = (url: string) => apiClient.get(url).then((res) => res.data);

const getRoleLabel = (rol: string) => {
  if (rol === 'OPERADOR') return 'Operador (Caja)';
  if (rol === 'PREVENTISTA') return 'Preventista';
  if (rol === 'ADMIN') return 'Administrador';
  if (rol === 'SUPER_ADMIN') return 'Super Admin';
  if (rol === 'REPARTIDOR') return 'Repartidor';
  return rol;
};

const EMPTY_CREATE_FORM = {
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
  featureMesas: false,
  featureWhatsappBot: false,
  featurePosBarcode: false,
};

const FOGON_CREATE_OVERRIDES = {
  ivaPorcentaje: 21,
  pagoEfectivoHabilitado: true,
  pagoTransferenciaHabilitado: true,
  pagoMercadoPagoHabilitado: false,
  clientesHabilitado: true,
  remitosHabilitado: false,
  comprasHabilitado: true,
  stockHabilitado: true,
  featureMesas: true,
  featureWhatsappBot: true,
  featurePosBarcode: false,
};

const DISTRI_CREATE_OVERRIDES = {
  ivaPorcentaje: 21,
  pagoEfectivoHabilitado: true,
  pagoTransferenciaHabilitado: true,
  pagoMercadoPagoHabilitado: false,
  clientesHabilitado: true,
  remitosHabilitado: true,
  comprasHabilitado: true,
  stockHabilitado: true,
  featureMesas: false,
  featureWhatsappBot: false,
  featurePosBarcode: true,
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

type CreateForm = typeof EMPTY_CREATE_FORM;
type PaqueteTipo = 'FOGON' | 'DISTRIBUIDORA' | 'MIXTO';

function detectarPaquete(config: any, mesasOn: boolean): PaqueteTipo {
  const remitos = Boolean(config?.remitosHabilitado);
  // Fogón: sin remitos + mesas. Distribuidora: remitos on + sin mesas.
  if (!remitos && mesasOn) return 'FOGON';
  if (remitos && !mesasOn) return 'DISTRIBUIDORA';
  return 'MIXTO';
}

export const SuperAdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const { data, error, isLoading, mutate } = useSWR<TenantConfig[]>('/admin/tenants', fetcher);
  const tenants = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [tenantQuery, setTenantQuery] = useState('');
  const [listOpenMobile, setListOpenMobile] = useState(false);
  const [savingFeature, setSavingFeature] = useState<string | null>(null);
  const [savingModule, setSavingModule] = useState<string | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingTenant, setIsCreatingTenant] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>({ ...EMPTY_CREATE_FORM });
  const [aplicandoFogon, setAplicandoFogon] = useState(false);
  const [aplicandoDistri, setAplicandoDistri] = useState(false);

  const filteredTenants = useMemo(() => {
    const q = tenantQuery.trim().toLowerCase();
    if (!q) return tenants;
    return tenants.filter(
      (t) =>
        t.tenantId.toLowerCase().includes(q) ||
        (t.nombreEmpresa || '').toLowerCase().includes(q)
    );
  }, [tenants, tenantQuery]);

  const effectiveTenantId = selectedTenantId || tenants[0]?.tenantId || '';
  const selectedTenant = tenants.find((tenant) => tenant.tenantId === effectiveTenantId) || null;

  const { data: tenantConfigData, mutate: mutateTenantConfig } = useSWR<any>(
    effectiveTenantId ? `/admin/tenants/${effectiveTenantId}/config` : null,
    fetcher
  );
  const { data: featureData, mutate: mutateFeatures } = useSWR<TenantFeature[]>(
    effectiveTenantId ? `/superadmin/tenants/${effectiveTenantId}/features` : null,
    fetcher
  );
  const { data: usersData, isLoading: isLoadingUsers, mutate: mutateUsers } = useSWR<TenantUser[]>(
    effectiveTenantId ? `/admin/tenants/${effectiveTenantId}/usuarios` : null,
    fetcher
  );

  const posBarcode = Array.isArray(featureData)
    ? featureData.find((f) => f.featureKey === 'POS_BARCODE')
    : null;
  const whatsappBot = Array.isArray(featureData)
    ? featureData.find((f) => f.featureKey === 'WHATSAPP_BOT')
    : null;
  const mesasFeature = Array.isArray(featureData)
    ? featureData.find((f) => f.featureKey === 'MESAS')
    : null;

  const mesasOn = Boolean(mesasFeature?.enabled);
  const whatsappOn = Boolean(whatsappBot?.enabled);
  const paquete = detectarPaquete(tenantConfigData, mesasOn);

  const fogonChecks = [
    { ok: tenantConfigData?.remitosHabilitado === false, label: 'Remitos off' },
    { ok: Boolean(tenantConfigData?.stockHabilitado), label: 'Stock' },
    { ok: Boolean(tenantConfigData?.clientesHabilitado), label: 'Clientes' },
    { ok: Boolean(tenantConfigData?.comprasHabilitado), label: 'Compras' },
    { ok: mesasOn, label: 'Mesas' },
    { ok: whatsappOn, label: 'WhatsApp bot' },
    { ok: Boolean(tenantConfigData?.pagoEfectivoHabilitado), label: 'Efectivo' },
    { ok: Number(tenantConfigData?.ivaPorcentaje) === 21, label: 'IVA 21' },
  ];
  const fogonScore = fogonChecks.filter((c) => c.ok).length;

  const distriChecks = [
    { ok: Boolean(tenantConfigData?.remitosHabilitado), label: 'Remitos' },
    { ok: Boolean(tenantConfigData?.stockHabilitado), label: 'Stock' },
    { ok: Boolean(tenantConfigData?.clientesHabilitado), label: 'Clientes' },
    { ok: Boolean(tenantConfigData?.comprasHabilitado), label: 'Compras' },
    { ok: !mesasOn, label: 'Sin mesas' },
    { ok: Boolean(posBarcode?.enabled), label: 'Barcode POS' },
    { ok: Boolean(tenantConfigData?.pagoEfectivoHabilitado), label: 'Efectivo' },
    { ok: Number(tenantConfigData?.ivaPorcentaje) === 21, label: 'IVA 21' },
  ];
  const distriScore = distriChecks.filter((c) => c.ok).length;

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

  const selectTenant = (id: string) => {
    setSelectedTenantId(id);
    setListOpenMobile(false);
  };

  const toggleTenantModule = async (moduleKey: string, currentValue: boolean) => {
    if (!effectiveTenantId || !tenantConfigData) return;
    setSavingModule(moduleKey);
    setFeedback(null);
    try {
      await apiClient.put(`/admin/tenants/${effectiveTenantId}/config`, {
        ...tenantConfigData,
        [moduleKey]: !currentValue,
      });
      await mutateTenantConfig();
      setFeedback({
        type: 'success',
        message: `${moduleKey} ${!currentValue ? 'activado' : 'desactivado'} en ${effectiveTenantId}.`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'No pudimos actualizar el módulo.' });
    } finally {
      setSavingModule(null);
    }
  };

  const toggleFeature = async (featureKey: string, currentEnabled: boolean) => {
    if (!effectiveTenantId) return;
    setSavingFeature(featureKey);
    setFeedback(null);
    try {
      await apiClient.put(`/superadmin/tenants/${effectiveTenantId}/features/${featureKey}`, {
        enabled: !currentEnabled,
      });
      await mutateFeatures();
      setFeedback({
        type: 'success',
        message: `${featureKey} ${!currentEnabled ? 'activado' : 'desactivado'} en ${effectiveTenantId}.`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'No pudimos actualizar la feature.' });
    } finally {
      setSavingFeature(null);
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
        message: `${selectedTenant.tenantId} ${selectedTenant.activo ? 'pausado' : 'activado'}.`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'No pudimos cambiar el estado.' });
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const aplicarPresetFogonEnForm = () => {
    setCreateForm((prev) => ({
      ...prev,
      ...FOGON_CREATE_OVERRIDES,
      tenantId: prev.tenantId || 'fogon',
      nombreEmpresa: prev.nombreEmpresa || 'Fogón',
    }));
  };

  const aplicarPresetDistriEnForm = () => {
    setCreateForm((prev) => ({
      ...prev,
      ...DISTRI_CREATE_OVERRIDES,
    }));
  };

  const setFeatureSafe = async (key: string, enabled: boolean) => {
    await apiClient.put(`/superadmin/tenants/${effectiveTenantId}/features/${key}`, { enabled });
  };

  const aplicarPaqueteFogonAlTenant = async () => {
    if (!effectiveTenantId || !tenantConfigData) return;
    setAplicandoFogon(true);
    setFeedback(null);
    try {
      await apiClient.put(`/admin/tenants/${effectiveTenantId}/config`, {
        ...tenantConfigData,
        remitosHabilitado: false,
        clientesHabilitado: true,
        comprasHabilitado: true,
        stockHabilitado: true,
        pagoEfectivoHabilitado: true,
        pagoTransferenciaHabilitado: true,
        ivaPorcentaje: 21,
      });
      await setFeatureSafe('MESAS', true);
      await setFeatureSafe('WHATSAPP_BOT', true);
      await setFeatureSafe('POS_BARCODE', false);
      await mutateTenantConfig();
      await mutateFeatures();
      setFeedback({ type: 'success', message: `Paquete Fogón aplicado a ${effectiveTenantId}.` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'No pudimos aplicar Fogón.' });
    } finally {
      setAplicandoFogon(false);
    }
  };

  const aplicarPaqueteDistriAlTenant = async () => {
    if (!effectiveTenantId || !tenantConfigData) return;
    setAplicandoDistri(true);
    setFeedback(null);
    try {
      await apiClient.put(`/admin/tenants/${effectiveTenantId}/config`, {
        ...tenantConfigData,
        remitosHabilitado: true,
        clientesHabilitado: true,
        comprasHabilitado: true,
        stockHabilitado: true,
        pagoEfectivoHabilitado: true,
        pagoTransferenciaHabilitado: true,
        ivaPorcentaje: 21,
      });
      await setFeatureSafe('MESAS', false);
      await setFeatureSafe('WHATSAPP_BOT', false);
      await setFeatureSafe('POS_BARCODE', true);
      await mutateTenantConfig();
      await mutateFeatures();
      setFeedback({ type: 'success', message: `Paquete Distribuidora aplicado a ${effectiveTenantId}.` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'No pudimos aplicar Distribuidora.' });
    } finally {
      setAplicandoDistri(false);
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingTenant(true);
    setFeedback(null);
    try {
      const tenantId = createForm.tenantId.trim().toLowerCase();
      const nombreEmpresa = createForm.nombreEmpresa.trim();
      await apiClient.post('/admin/tenants', {
        tenantId,
        nombreEmpresa,
        adminEmail: createForm.adminEmail.trim(),
        adminPassword: createForm.adminPassword,
        ivaPorcentaje: createForm.ivaPorcentaje,
        pagoEfectivoHabilitado: createForm.pagoEfectivoHabilitado,
        pagoTransferenciaHabilitado: createForm.pagoTransferenciaHabilitado,
        pagoMercadoPagoHabilitado: createForm.pagoMercadoPagoHabilitado,
        clientesHabilitado: createForm.clientesHabilitado,
        remitosHabilitado: createForm.remitosHabilitado,
        comprasHabilitado: createForm.comprasHabilitado,
        stockHabilitado: createForm.stockHabilitado,
        aliasCobro: createForm.aliasCobro || null,
        featureMesas: createForm.featureMesas,
        featureWhatsappBot: createForm.featureWhatsappBot,
        featurePosBarcode: createForm.featurePosBarcode,
      });
      await mutate();
      setSelectedTenantId(tenantId);
      setIsCreateModalOpen(false);
      setCreateForm({ ...EMPTY_CREATE_FORM });
      const extras = [
        createForm.featureMesas ? 'MESAS' : null,
        createForm.featureWhatsappBot ? 'WHATSAPP_BOT' : null,
        createForm.featurePosBarcode ? 'POS_BARCODE' : null,
      ].filter(Boolean);
      setFeedback({
        type: 'success',
        message: `"${nombreEmpresa}" creada (${tenantId}).${extras.length ? ` Features: ${extras.join(', ')}.` : ''} Si tiene mesas: lote 1–12.`,
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

  const patchCreate = <K extends keyof CreateForm>(key: K, value: CreateForm[K]) => {
    setCreateForm((prev) => ({ ...prev, [key]: value }));
  };

  const packagePill =
    paquete === 'FOGON'
      ? { label: 'Paquete Fogón', tone: 'amber' as const }
      : paquete === 'DISTRIBUIDORA'
        ? { label: 'Paquete Distribuidora', tone: 'blue' as const }
        : { label: 'Configuración mixta', tone: 'slate' as const };

  const activeChecks = paquete === 'FOGON' ? fogonChecks : paquete === 'DISTRIBUIDORA' ? distriChecks : fogonChecks;
  const activeScore = paquete === 'FOGON' ? fogonScore : paquete === 'DISTRIBUIDORA' ? distriScore : fogonScore;
  const checklistTitle =
    paquete === 'FOGON'
      ? 'Checklist Fogón'
      : paquete === 'DISTRIBUIDORA'
        ? 'Checklist Distribuidora'
        : 'Checklist (perfil mixto)';

  return (
    <div className="tulum-app min-h-screen bg-tulum-ink font-sans text-tulum-bone selection:bg-tulum-accent/30 selection:text-white">
      <header className="sticky top-0 z-20 border-b border-tulum-border bg-tulum-ink">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-tulum-accent text-white">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-tulum-muted">Tulum Core</p>
              <h1 className="text-lg font-semibold tracking-tight text-tulum-bone">Plataforma</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AppButton type="button" icon={Plus} onClick={() => setIsCreateModalOpen(true)} className="flex-1 sm:flex-none">
              Nueva empresa
            </AppButton>
            <AppButton type="button" variant="secondary" icon={RefreshCw} onClick={refresh}>
              <span className="hidden sm:inline">Refrescar</span>
            </AppButton>
            <AppButton type="button" variant="danger" icon={LogOut} onClick={logout}>
              <span className="hidden sm:inline">Salir</span>
            </AppButton>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-4 px-4 py-4 sm:gap-5 sm:px-6 sm:py-6 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="lg:hidden">
          <button
            type="button"
            onClick={() => setListOpenMobile(true)}
            className="flex w-full items-center justify-between rounded-2xl border border-tulum-border bg-tulum-surface px-4 py-3 text-left"
          >
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-tulum-muted">Empresa</p>
              <p className="truncate font-semibold text-tulum-bone">
                {selectedTenant?.nombreEmpresa || selectedTenant?.tenantId || 'Elegir tenant'}
              </p>
              {selectedTenant && (
                <p className="truncate font-mono text-xs text-tulum-muted">{selectedTenant.tenantId}</p>
              )}
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-tulum-muted" />
          </button>
        </div>

        <aside
          className={`${
            listOpenMobile ? 'fixed inset-0 z-40 flex flex-col bg-tulum-ink' : 'hidden'
          } lg:relative lg:z-auto lg:flex lg:flex-col lg:overflow-hidden lg:rounded-2xl lg:border lg:border-tulum-border lg:bg-tulum-surface`}
        >
          <div className="flex items-center justify-between border-b border-tulum-border px-4 py-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-tulum-bone">
              <Building2 className="h-4 w-4 text-tulum-accent" />
              Empresas
              <span className="rounded-md bg-tulum-elevated px-1.5 py-0.5 text-[10px] font-semibold text-tulum-muted">
                {tenants.length}
              </span>
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="rounded-xl border border-tulum-border p-2 text-tulum-bone hover:bg-tulum-elevated"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setListOpenMobile(false)}
                className="rounded-xl border border-tulum-border p-2 text-tulum-bone hover:bg-tulum-elevated lg:hidden"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="border-b border-tulum-border px-3 py-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tulum-muted" />
              <input
                value={tenantQuery}
                onChange={(e) => setTenantQuery(e.target.value)}
                placeholder="Buscar slug o nombre…"
                className={`${fieldClass} pl-9`}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {isLoading ? (
              <p className="p-4 text-center text-sm text-tulum-muted">Cargando…</p>
            ) : error ? (
              <ErrorAlert message="No pudimos cargar los tenants." />
            ) : filteredTenants.length === 0 ? (
              <div className="rounded-xl border border-dashed border-tulum-border p-6 text-center text-sm text-tulum-muted">
                {tenants.length === 0 ? 'Todavía no hay empresas.' : 'Sin resultados.'}
              </div>
            ) : (
              <ul className="space-y-1.5">
                {filteredTenants.map((tenant) => {
                  const active = effectiveTenantId === tenant.tenantId;
                  return (
                    <li key={tenant.tenantId}>
                      <button
                        type="button"
                        onClick={() => selectTenant(tenant.tenantId)}
                        className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                          active
                            ? 'border-tulum-accent/40 bg-tulum-accent/10'
                            : 'border-transparent hover:bg-tulum-elevated'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-tulum-bone">
                              {tenant.nombreEmpresa || tenant.tenantId}
                            </p>
                            <p className="truncate font-mono text-[11px] text-tulum-muted">{tenant.tenantId}</p>
                          </div>
                          <StatusPill
                            label={tenant.activo ? 'Activo' : 'Pausa'}
                            tone={tenant.activo ? 'emerald' : 'red'}
                          />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        <section className="min-w-0 space-y-4 sm:space-y-5">
          {feedback && <ErrorAlert type={feedback.type} message={feedback.message} />}

          {!selectedTenant ? (
            <div className="rounded-2xl border border-dashed border-tulum-border bg-tulum-surface px-6 py-16 text-center">
              <Building2 className="mx-auto mb-3 h-8 w-8 text-tulum-muted" />
              <p className="text-lg font-semibold text-tulum-bone">Elegí una empresa</p>
              <p className="mt-1 text-sm text-tulum-muted">O creá la primera con Nueva empresa.</p>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-2xl border border-tulum-border bg-tulum-surface">
                <div className="border-b border-tulum-border px-4 py-4 sm:px-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-tulum-muted">Empresa</p>
                      <h2 className="mt-1 truncate text-xl font-semibold tracking-tight text-tulum-bone">
                        {selectedTenant.nombreEmpresa || selectedTenant.tenantId}
                      </h2>
                      <p className="mt-1 font-mono text-xs text-tulum-muted">{selectedTenant.tenantId}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <StatusPill
                          label={selectedTenant.activo ? 'Activo' : 'Pausado'}
                          tone={selectedTenant.activo ? 'emerald' : 'red'}
                        />
                        <StatusPill label={packagePill.label} tone={packagePill.tone} />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <AppButton
                        type="button"
                        variant="secondary"
                        icon={Flame}
                        onClick={aplicarPaqueteFogonAlTenant}
                        disabled={aplicandoFogon}
                        className="text-xs"
                      >
                        {aplicandoFogon ? 'Aplicando…' : 'Aplicar Fogón'}
                      </AppButton>
                      <AppButton
                        type="button"
                        variant="secondary"
                        icon={Truck}
                        onClick={aplicarPaqueteDistriAlTenant}
                        disabled={aplicandoDistri}
                        className="text-xs"
                      >
                        {aplicandoDistri ? 'Aplicando…' : 'Aplicar Distribuidora'}
                      </AppButton>
                      <AppButton
                        type="button"
                        variant={selectedTenant.activo ? 'danger' : 'success'}
                        icon={Power}
                        onClick={toggleTenantStatus}
                        disabled={isTogglingStatus}
                        className="text-xs"
                      >
                        {selectedTenant.activo ? 'Pausar' : 'Activar'}
                      </AppButton>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-tulum-muted">
                      {checklistTitle} · {activeScore}/{activeChecks.length}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {activeChecks.map((c) => (
                        <span
                          key={c.label}
                          className={`rounded-lg border px-2 py-1 text-[11px] font-bold ${
                            c.ok
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                              : 'border-tulum-border bg-tulum-elevated text-tulum-muted'
                          }`}
                        >
                          {c.ok ? '✓' : '·'} {c.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-tulum-elevated sm:w-40">
                    <div
                      className={`h-full rounded-full transition-all ${
                        paquete === 'DISTRIBUIDORA' ? 'bg-tulum-accent' : 'bg-tulum-success'
                      }`}
                      style={{ width: `${(activeScore / activeChecks.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <Panel title="Módulos del paquete">
                <div className="grid gap-2 sm:grid-cols-2">
                  <ToggleRow
                    title="Clientes"
                    hint="Directorio y cuentas"
                    on={Boolean(tenantConfigData?.clientesHabilitado ?? true)}
                    busy={savingModule === 'clientesHabilitado'}
                    onToggle={() =>
                      toggleTenantModule('clientesHabilitado', Boolean(tenantConfigData?.clientesHabilitado ?? true))
                    }
                  />
                  <ToggleRow
                    title="Remitos"
                    hint="Hojas de ruta / logística"
                    on={Boolean(tenantConfigData?.remitosHabilitado ?? true)}
                    busy={savingModule === 'remitosHabilitado'}
                    onToggle={() =>
                      toggleTenantModule('remitosHabilitado', Boolean(tenantConfigData?.remitosHabilitado ?? true))
                    }
                  />
                  <ToggleRow
                    title="Compras"
                    hint="Proveedores e ingresos"
                    on={Boolean(tenantConfigData?.comprasHabilitado ?? true)}
                    busy={savingModule === 'comprasHabilitado'}
                    onToggle={() =>
                      toggleTenantModule('comprasHabilitado', Boolean(tenantConfigData?.comprasHabilitado ?? true))
                    }
                  />
                  <ToggleRow
                    title="Stock"
                    hint="Kardex y movimientos"
                    on={Boolean(tenantConfigData?.stockHabilitado ?? true)}
                    busy={savingModule === 'stockHabilitado'}
                    onToggle={() =>
                      toggleTenantModule('stockHabilitado', Boolean(tenantConfigData?.stockHabilitado ?? true))
                    }
                  />
                </div>
              </Panel>

              <Panel title="Features verticales">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <ToggleRow
                    title="Mesas"
                    hint="Salón · abrir cuenta"
                    on={mesasOn}
                    busy={savingFeature === 'MESAS'}
                    onToggle={() => toggleFeature('MESAS', mesasOn)}
                  />
                  <ToggleRow
                    title="WhatsApp bot"
                    hint="POST externo con secret"
                    on={whatsappOn}
                    busy={savingFeature === 'WHATSAPP_BOT'}
                    onToggle={() => toggleFeature('WHATSAPP_BOT', whatsappOn)}
                  />
                  <ToggleRow
                    title="Código de barras"
                    hint="Escáner en POS"
                    on={Boolean(posBarcode?.enabled)}
                    busy={savingFeature === 'POS_BARCODE'}
                    onToggle={() => toggleFeature('POS_BARCODE', posBarcode?.enabled ?? false)}
                  />
                </div>
                <p className="mt-3 text-xs text-tulum-muted">
                  Pedidos (delivery / retiro) está siempre en el menú del comercio.
                </p>
              </Panel>

              <Panel title="Cobro">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>IVA en ticket</label>
                    <select
                      value={tenantConfigData?.ivaPorcentaje ?? 21}
                      disabled={savingModule === 'ivaPorcentaje'}
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
                      className={fieldClass}
                    >
                      <option value={0}>0% (no discrimina)</option>
                      <option value={10.5}>10.5%</option>
                      <option value={21}>21%</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <p className={labelClass}>Medios de pago POS</p>
                    {(
                      [
                        ['pagoEfectivoHabilitado', 'Efectivo'],
                        ['pagoTransferenciaHabilitado', 'Transferencia'],
                        ['pagoMercadoPagoHabilitado', 'Mercado Pago'],
                      ] as const
                    ).map(([key, label]) => (
                      <ToggleRow
                        key={key}
                        title={label}
                        compact
                        on={Boolean(tenantConfigData?.[key] ?? key === 'pagoEfectivoHabilitado')}
                        busy={savingModule === key}
                        onToggle={() =>
                          toggleTenantModule(
                            key,
                            Boolean(tenantConfigData?.[key] ?? key === 'pagoEfectivoHabilitado')
                          )
                        }
                      />
                    ))}
                  </div>
                </div>
              </Panel>

              <Panel
                title="Usuarios"
                trailing={
                  <span className="text-xs font-bold text-tulum-muted">
                    {Array.isArray(usersData) ? usersData.length : 0}
                  </span>
                }
              >
                {isLoadingUsers ? (
                  <p className="text-sm text-tulum-muted">Cargando…</p>
                ) : !Array.isArray(usersData) || usersData.length === 0 ? (
                  <p className="text-sm text-tulum-muted">Sin usuarios en este tenant.</p>
                ) : (
                  <ul className="divide-y divide-tulum-border">
                    {usersData.map((u) => (
                      <li
                        key={u.id}
                        className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <Mail className="h-4 w-4 shrink-0 text-tulum-muted" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-tulum-bone">{u.email}</p>
                            <p className="font-mono text-[11px] text-tulum-muted">#{u.id}</p>
                          </div>
                        </div>
                        <span className="rounded-lg border border-tulum-border bg-tulum-elevated px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-tulum-muted">
                          {getRoleLabel(u.rol)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </>
          )}
        </section>
      </main>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-tulum-ink/70 backdrop-blur-sm sm:items-center sm:p-4">
          <div
            className="absolute inset-0"
            onClick={() => !isCreatingTenant && setIsCreateModalOpen(false)}
            aria-hidden
          />
          <form
            onSubmit={handleCreateTenant}
            className="relative z-10 flex max-h-[94vh] w-full max-w-xl flex-col rounded-t-2xl border border-tulum-border bg-tulum-surface sm:max-h-[90vh] sm:rounded-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-tulum-border px-4 py-4 sm:px-5">
              <div>
                <h3 className="text-xl font-semibold text-tulum-bone">Nueva empresa</h3>
                <p className="mt-0.5 text-xs text-tulum-muted">Preset + admin inicial en un solo paso.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-xl p-2 text-tulum-muted hover:bg-tulum-elevated"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
              <div className="flex flex-wrap gap-2">
                <AppButton type="button" variant="dark" icon={Flame} onClick={aplicarPresetFogonEnForm} className="text-xs">
                  Preset Fogón
                </AppButton>
                <AppButton type="button" variant="secondary" icon={Truck} onClick={aplicarPresetDistriEnForm} className="text-xs">
                  Preset Distribuidora
                </AppButton>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Slug (tenant id) *</label>
                  <input
                    required
                    value={createForm.tenantId}
                    pattern="[a-z0-9][a-z0-9_\-]{2,40}"
                    title="Solo minúsculas, números, guion o guion bajo (3–41 chars)"
                    placeholder="chirino"
                    onChange={(e) => patchCreate('tenantId', e.target.value.toLowerCase())}
                    className={`${fieldClass} font-mono`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Nombre comercial *</label>
                  <input
                    required
                    value={createForm.nombreEmpresa}
                    placeholder="Chirino"
                    onChange={(e) => patchCreate('nombreEmpresa', e.target.value)}
                    className={fieldClass}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>IVA</label>
                  <select
                    value={createForm.ivaPorcentaje}
                    onChange={(e) => patchCreate('ivaPorcentaje', Number(e.target.value))}
                    className={fieldClass}
                  >
                    <option value={0}>0%</option>
                    <option value={10.5}>10.5%</option>
                    <option value={21}>21%</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Alias / CBU</label>
                  <input
                    value={createForm.aliasCobro}
                    placeholder="opcional"
                    onChange={(e) => patchCreate('aliasCobro', e.target.value)}
                    className={fieldClass}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <CheckGroup
                  title="Pagos"
                  items={[
                    ['pagoEfectivoHabilitado', 'Efectivo'],
                    ['pagoTransferenciaHabilitado', 'Transferencia'],
                    ['pagoMercadoPagoHabilitado', 'Mercado Pago'],
                  ]}
                  form={createForm}
                  onChange={patchCreate}
                />
                <CheckGroup
                  title="Módulos"
                  items={[
                    ['clientesHabilitado', 'Clientes'],
                    ['remitosHabilitado', 'Remitos'],
                    ['comprasHabilitado', 'Compras'],
                    ['stockHabilitado', 'Stock'],
                  ]}
                  form={createForm}
                  onChange={patchCreate}
                />
                <CheckGroup
                  title="Verticales"
                  items={[
                    ['featureMesas', 'Mesas'],
                    ['featureWhatsappBot', 'WhatsApp bot'],
                    ['featurePosBarcode', 'Barcode POS'],
                  ]}
                  form={createForm}
                  onChange={patchCreate}
                />
              </div>

              <div className="rounded-xl border border-tulum-border bg-tulum-ink p-3 sm:p-4">
                <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-tulum-muted">
                  <Users className="h-3.5 w-3.5" />
                  Admin inicial
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Email *</label>
                    <input
                      type="email"
                      required
                      value={createForm.adminEmail}
                      onChange={(e) => patchCreate('adminEmail', e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Password * (mín. 8)</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={createForm.adminPassword}
                      onChange={(e) => patchCreate('adminPassword', e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 border-t border-tulum-border px-4 py-3 sm:px-5">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-xl px-4 py-2.5 text-sm font-bold text-tulum-muted hover:bg-tulum-elevated"
              >
                Cancelar
              </button>
              <AppButton type="submit" disabled={isCreatingTenant} className="ml-auto flex-1 sm:flex-none">
                {isCreatingTenant ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Creando…
                  </>
                ) : (
                  'Crear empresa'
                )}
              </AppButton>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

function Panel({
  title,
  trailing,
  children,
}: {
  title: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-tulum-border bg-tulum-surface p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-tulum-muted">{title}</h3>
        {trailing}
      </div>
      {children}
    </div>
  );
}

function ToggleRow({
  title,
  hint,
  on,
  busy,
  onToggle,
  compact,
}: {
  title: string;
  hint?: string;
  on: boolean;
  busy?: boolean;
  onToggle: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onToggle}
      className={`flex w-full items-center justify-between gap-3 rounded-xl border text-left transition disabled:opacity-50 ${
        compact
          ? 'border-transparent px-1 py-1.5 hover:bg-tulum-elevated'
          : on
            ? 'border-emerald-500/30 bg-emerald-500/10 px-3 py-3'
            : 'border-tulum-border bg-tulum-ink px-3 py-3 hover:border-tulum-border'
      }`}
    >
      <div className="min-w-0">
        <p className="text-sm font-bold text-tulum-bone">{title}</p>
        {hint && !compact && <p className="mt-0.5 text-xs text-tulum-muted">{hint}</p>}
      </div>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? 'bg-tulum-success' : 'bg-tulum-border'}`}
        aria-hidden
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
            on ? 'left-[1.35rem]' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  );
}

function CheckGroup({
  title,
  items,
  form,
  onChange,
}: {
  title: string;
  items: ReadonlyArray<readonly [keyof CreateForm, string]>;
  form: CreateForm;
  onChange: <K extends keyof CreateForm>(key: K, value: CreateForm[K]) => void;
}) {
  return (
    <div className="rounded-xl border border-tulum-border bg-tulum-ink p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-tulum-muted">{title}</p>
      <div className="space-y-2">
        {items.map(([key, label]) => (
          <label key={String(key)} className="flex items-center justify-between gap-2 text-sm text-tulum-bone">
            <span>{label}</span>
            <input
              type="checkbox"
              checked={Boolean(form[key])}
              onChange={(e) => onChange(key, e.target.checked as CreateForm[typeof key])}
              className="h-4 w-4 rounded border-tulum-border bg-tulum-ink accent-tulum-accent"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
