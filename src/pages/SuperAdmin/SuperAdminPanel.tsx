import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  Building2,
  LogOut,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/axiosConfig';
import { AppButton } from '../../components/ui/AppButton';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { LoadingState } from '../../components/ui/LoadingState';
import { StatusPill } from '../../components/ui/StatusPill';

const fetcher = (url: string) => apiClient.get(url).then((res) => res.data);

interface TenantConfig {
  id?: number;
  tenantId: string;
  nombreEmpresa?: string;
  logoUrl?: string;
  activo: boolean;
  clientesHabilitado: boolean;
  remitosHabilitado: boolean;
  comprasHabilitado: boolean;
  stockHabilitado: boolean;
  mpAceptarCredito: boolean;
  mpAceptarDebito: boolean;
  mpAceptarEfectivo: boolean;
}

interface TenantUser {
  id: number;
  email: string;
  rol: string;
}

interface NewTenantForm {
  tenantId: string;
  nombreEmpresa: string;
  adminEmail: string;
  adminPassword: string;
}

const moduleFields: Array<{ key: keyof TenantConfig; label: string }> = [
  { key: 'clientesHabilitado', label: 'Clientes' },
  { key: 'remitosHabilitado', label: 'Remitos' },
  { key: 'comprasHabilitado', label: 'Compras' },
  { key: 'stockHabilitado', label: 'Stock' },
  { key: 'mpAceptarCredito', label: 'MP credito' },
  { key: 'mpAceptarDebito', label: 'MP debito' },
  { key: 'mpAceptarEfectivo', label: 'Efectivo' },
];

export const SuperAdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const { data, error, isLoading, mutate } = useSWR<TenantConfig[]>('/admin/tenants', fetcher);
  const tenants = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [draft, setDraft] = useState<TenantConfig | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTenant, setNewTenant] = useState<NewTenantForm>({
    tenantId: '',
    nombreEmpresa: '',
    adminEmail: '',
    adminPassword: '',
  });

  const selectedTenant = useMemo(() => {
    const tenantId = selectedTenantId || tenants[0]?.tenantId || '';
    return tenants.find((tenant) => tenant.tenantId === tenantId) || null;
  }, [selectedTenantId, tenants]);

  const effectiveTenantId = selectedTenant?.tenantId || '';
  const { data: users, isLoading: isLoadingUsers, mutate: mutateUsers } = useSWR<TenantUser[]>(
    effectiveTenantId ? `/admin/tenants/${effectiveTenantId}/usuarios` : null,
    fetcher,
  );

  React.useEffect(() => {
    if (selectedTenant && (!draft || draft.tenantId !== selectedTenant.tenantId)) {
      setDraft(selectedTenant);
    }
  }, [draft, selectedTenant]);

  const logout = () => {
    localStorage.clear();
    navigate('/login', { replace: true });
  };

  const toggleTenantStatus = async (tenant: TenantConfig) => {
    setFeedback(null);
    try {
      await apiClient.put(`/admin/tenants/${tenant.tenantId}/status`, { activo: !tenant.activo });
      await mutate();
      setFeedback({ type: 'success', message: `Tenant ${tenant.tenantId} actualizado.` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'No pudimos actualizar el tenant.' });
    }
  };

  const saveConfig = async () => {
    if (!draft) return;
    setSaving(true);
    setFeedback(null);
    try {
      await apiClient.put(`/admin/tenants/${draft.tenantId}/config`, draft);
      await mutate();
      await mutateUsers();
      setFeedback({ type: 'success', message: 'Configuracion del tenant guardada.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'No pudimos guardar la configuracion.' });
    } finally {
      setSaving(false);
    }
  };

  const createTenant = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setFeedback(null);
    try {
      const response = await apiClient.post('/admin/tenants', newTenant);
      const created = response.data as TenantConfig;
      setNewTenant({ tenantId: '', nombreEmpresa: '', adminEmail: '', adminPassword: '' });
      await mutate();
      setSelectedTenantId(created.tenantId);
      setDraft(created);
      setFeedback({ type: 'success', message: `Tenant ${created.tenantId} creado correctamente.` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || err.response?.data?.error || 'No pudimos crear el tenant.' });
    } finally {
      setCreating(false);
    }
  };

  const updateDraft = (patch: Partial<TenantConfig>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  };

  const updateNewTenant = (field: keyof NewTenantForm, value: string) => {
    setNewTenant((current) => ({ ...current, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/95 px-5 py-4 shadow-2xl shadow-black/20">
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
            <AppButton variant="secondary" icon={RefreshCw} onClick={() => mutate()}>
              Refrescar
            </AppButton>
            <AppButton variant="danger" icon={LogOut} onClick={logout}>
              Salir
            </AppButton>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-5 py-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section className="space-y-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/25">
          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="flex items-center gap-2 text-lg font-black text-white">
              <Plus className="h-5 w-5 text-emerald-300" />
              Nuevo tenant
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-400">Crea un cliente con su usuario admin inicial.</p>
          </div>
          <form onSubmit={createTenant} className="space-y-3 p-4">
            <input
              value={newTenant.tenantId}
              onChange={(event) => updateNewTenant('tenantId', event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-100 outline-none focus:border-blue-400"
              placeholder="tenant-id"
              disabled={creating}
            />
            <input
              value={newTenant.nombreEmpresa}
              onChange={(event) => updateNewTenant('nombreEmpresa', event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-100 outline-none focus:border-blue-400"
              placeholder="Nombre de empresa"
              disabled={creating}
            />
            <input
              type="email"
              value={newTenant.adminEmail}
              onChange={(event) => updateNewTenant('adminEmail', event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-100 outline-none focus:border-blue-400"
              placeholder="admin@cliente.com"
              disabled={creating}
            />
            <input
              type="password"
              value={newTenant.adminPassword}
              onChange={(event) => updateNewTenant('adminPassword', event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-100 outline-none focus:border-blue-400"
              placeholder="Password inicial"
              disabled={creating}
            />
            <AppButton className="w-full" icon={Plus} disabled={creating}>
              {creating ? 'Creando...' : 'Crear tenant'}
            </AppButton>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/25">
          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="flex items-center gap-2 text-lg font-black text-white">
              <Building2 className="h-5 w-5 text-blue-300" />
              Tenants
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-400">Clientes activos en la plataforma.</p>
          </div>
          <div className="p-4">
            {isLoading ? (
              <LoadingState label="Cargando tenants..." />
            ) : error ? (
              <ErrorAlert message="No pudimos cargar los tenants." />
            ) : tenants.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 text-sm font-semibold text-slate-400">
                No hay tenants configurados.
              </div>
            ) : (
              <div className="space-y-3">
                {tenants.map((tenant) => (
                  <button
                    key={tenant.tenantId}
                    type="button"
                    onClick={() => {
                      setSelectedTenantId(tenant.tenantId);
                      setDraft(tenant);
                    }}
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
        </div>
        </section>

        <section className="space-y-6">
          {feedback && <ErrorAlert type={feedback.type} message={feedback.message} />}

          {draft ? (
            <>
              <div className="rounded-2xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/25">
                <div className="flex flex-col gap-3 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-black text-white">{draft.nombreEmpresa || draft.tenantId}</h2>
                    <p className="mt-1 font-mono text-xs text-slate-500">{draft.tenantId}</p>
                  </div>
                  <AppButton
                    variant={draft.activo ? 'danger' : 'success'}
                    icon={draft.activo ? ToggleLeft : ToggleRight}
                    onClick={() => toggleTenantStatus(draft)}
                  >
                    {draft.activo ? 'Pausar tenant' : 'Activar tenant'}
                  </AppButton>
                </div>

                <div className="grid gap-5 p-5 lg:grid-cols-2">
                  <label>
                    <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">
                      Nombre comercial
                    </span>
                    <input
                      value={draft.nombreEmpresa || ''}
                      onChange={(event) => updateDraft({ nombreEmpresa: event.target.value })}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-100 outline-none focus:border-blue-400"
                    />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">
                      Logo URL
                    </span>
                    <input
                      value={draft.logoUrl || ''}
                      onChange={(event) => updateDraft({ logoUrl: event.target.value })}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-100 outline-none focus:border-blue-400"
                    />
                  </label>

                  <div className="lg:col-span-2">
                    <div className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">
                      Modulos y medios de pago
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {moduleFields.map((field) => (
                        <label
                          key={field.key}
                          className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-4 py-3"
                        >
                          <span className="text-sm font-bold text-slate-200">{field.label}</span>
                          <input
                            type="checkbox"
                            checked={Boolean(draft[field.key])}
                            onChange={(event) => updateDraft({ [field.key]: event.target.checked } as Partial<TenantConfig>)}
                            className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-blue-600"
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end lg:col-span-2">
                    <AppButton icon={Save} onClick={saveConfig} disabled={saving}>
                      {saving ? 'Guardando...' : 'Guardar configuracion'}
                    </AppButton>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/25">
                <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
                  <h2 className="flex items-center gap-2 text-lg font-black text-white">
                    <Users className="h-5 w-5 text-emerald-300" />
                    Usuarios del tenant
                  </h2>
                  <StatusPill label={`${Array.isArray(users) ? users.length : 0} usuarios`} tone="blue" />
                </div>
                {isLoadingUsers ? (
                  <div className="p-5">
                    <LoadingState label="Cargando usuarios..." />
                  </div>
                ) : !Array.isArray(users) || users.length === 0 ? (
                  <div className="p-5 text-sm font-semibold text-slate-400">No hay usuarios para mostrar.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="border-b border-slate-800 bg-slate-950 text-xs font-black uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-5 py-4">Email</th>
                          <th className="px-5 py-4">Rol</th>
                          <th className="px-5 py-4">ID</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {users.map((user) => (
                          <tr key={user.id}>
                            <td className="px-5 py-4 font-bold text-white">{user.email}</td>
                            <td className="px-5 py-4">
                              <StatusPill label={user.rol} tone={user.rol === 'ADMIN' ? 'indigo' : 'slate'} />
                            </td>
                            <td className="px-5 py-4 font-mono text-xs text-slate-500">#{user.id}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">
              Selecciona un tenant para ver su configuracion.
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
