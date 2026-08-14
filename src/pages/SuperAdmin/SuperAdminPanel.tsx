import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Building2, LogOut, RefreshCw, ShieldCheck } from 'lucide-react';
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

export const SuperAdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const { data, error, isLoading, mutate } = useSWR<TenantConfig[]>('/admin/tenants', fetcher);
  const tenants = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [savingFeature, setSavingFeature] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const effectiveTenantId = selectedTenantId || tenants[0]?.tenantId || '';
  const selectedTenant = tenants.find((tenant) => tenant.tenantId === effectiveTenantId) || null;

  const {
    data: featureData,
    error: featureError,
    isLoading: isLoadingFeatures,
    mutate: mutateFeatures,
  } = useSWR<TenantFeature[]>(
    effectiveTenantId ? `/superadmin/tenants/${effectiveTenantId}/features` : null,
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
    await mutateFeatures();
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
        <section className="rounded-2xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/25">
          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="flex items-center gap-2 text-lg font-black text-white">
              <Building2 className="h-5 w-5 text-blue-300" />
              Tenants
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-400">Selecciona un tenant para administrar features.</p>
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

        <section className="space-y-6">
          {feedback && <ErrorAlert type={feedback.type} message={feedback.message} />}

          {selectedTenant ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/25">
              <div className="border-b border-slate-800 px-5 py-4">
                <h2 className="text-xl font-black text-white">{selectedTenant.nombreEmpresa || selectedTenant.tenantId}</h2>
                <p className="mt-1 font-mono text-xs text-slate-500">{selectedTenant.tenantId}</p>
              </div>

              <div className="p-5">
                <div className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">
                  Funcionalidades configurables
                </div>

                {isLoadingFeatures ? (
                  <LoadingState label="Cargando features..." />
                ) : featureError ? (
                  <ErrorAlert message="No pudimos cargar las features del tenant." />
                ) : (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-sm font-black text-white">POS_BARCODE</div>
                        <p className="mt-1 text-sm font-medium text-slate-400">
                          Permite buscar productos por codigo de barras desde el POS.
                        </p>
                      </div>
                      <label className="flex cursor-pointer items-center gap-3">
                        <span className="text-sm font-bold text-slate-300">
                          {posBarcode?.enabled ? 'Habilitado' : 'Deshabilitado'}
                        </span>
                        <input
                          type="checkbox"
                          checked={Boolean(posBarcode?.enabled)}
                          onChange={togglePosBarcode}
                          disabled={!posBarcode || savingFeature === 'POS_BARCODE'}
                          className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-blue-600"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">
              Selecciona un tenant para ver sus features.
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
