import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { ArrowLeft, Clock, LayoutGrid, UtensilsCrossed, Wallet } from 'lucide-react';
import apiClient from '../../api/axiosConfig';
import { AppButton } from '../../components/ui/AppButton';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { MesaCuentaPanel } from '../Dashboard/components/MesaCuentaPanel';

const fetcher = (url: string) => apiClient.get(url).then((res) => res.data);

interface MesaMostrador {
  id: number;
  numero: number;
  nombre?: string;
  etiqueta?: string;
  estado: 'LIBRE' | 'OCUPADA' | string;
  totalFinal?: number;
  nroComprobante?: string;
  platos?: string[];
  estadoCuenta?: string;
}

const money = (n: number) =>
  Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 });

export const PosRestaurante: React.FC<{ nombreEmpresa?: string }> = ({ nombreEmpresa }) => {
  const navigate = useNavigate();
  const { data, error, isLoading, mutate } = useSWR('/mesas', fetcher, { refreshInterval: 8000 });
  const [mesaId, setMesaId] = useState<number | null>(null);
  const [abriendoId, setAbriendoId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const mesas: MesaMostrador[] = Array.isArray(data) ? data.filter((m: MesaMostrador) => m) : [];
  const ocupadas = useMemo(
    () => mesas.filter((m) => m.estado === 'OCUPADA').sort((a, b) => a.numero - b.numero),
    [mesas]
  );
  const libres = useMemo(
    () => mesas.filter((m) => m.estado !== 'OCUPADA').sort((a, b) => a.numero - b.numero),
    [mesas]
  );
  const totalSalon = ocupadas.reduce((acc, m) => acc + Number(m.totalFinal || 0), 0);

  const abrirLibre = async (mesa: MesaMostrador) => {
    setAbriendoId(mesa.id);
    setFeedback(null);
    try {
      await apiClient.post(`/mesas/${mesa.id}/abrir`);
      await mutate();
      setMesaId(mesa.id);
    } catch (err: any) {
      setFeedback(err.response?.data?.message || 'No se pudo abrir la mesa.');
    } finally {
      setAbriendoId(null);
    }
  };

  return (
    <div className="tulum-app relative h-screen w-screen flex flex-col bg-tulum-ink font-sans text-tulum-bone overflow-hidden">
      <header className="px-3 py-3 md:px-5 md:py-4 border-b border-tulum-border flex items-center gap-3 flex-shrink-0">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="px-2 py-2 md:px-3 border border-tulum-border bg-tulum-elevated rounded-lg hover:bg-tulum-surface text-tulum-bone font-semibold text-xs flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Volver</span>
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{nombreEmpresa || 'Tulum'}</p>
          <p className="text-[11px] text-tulum-muted">Mostrador · cobro de mesas</p>
        </div>
        <div className="rounded-lg border border-tulum-border bg-tulum-surface px-4 py-2 text-right">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-tulum-muted">Salón</div>
          <div className="text-lg font-bold">${money(totalSalon)}</div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-3 md:p-5 min-h-0">
        {feedback && (
          <div className="mb-3">
            <ErrorAlert message={feedback} />
          </div>
        )}
        {error && (
          <div className="mb-3">
            <ErrorAlert message="No pudimos cargar las mesas. ¿Está activo el módulo MESAS?" />
          </div>
        )}

        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-sm text-tulum-muted">
            <Clock className="mr-2 h-5 w-5 animate-spin text-tulum-accent" />
            Cargando mesas…
          </div>
        ) : mesas.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-tulum-muted">
            <UtensilsCrossed className="mb-3 h-10 w-10" />
            <p className="font-semibold text-tulum-bone">Todavía no hay mesas</p>
            <p className="mt-1 text-sm">Creálas en Mesas → Configurar.</p>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6">
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-wide text-tulum-muted">Para cobrar</h2>
                <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-black text-amber-100">
                  {ocupadas.length}
                </span>
              </div>
              {ocupadas.length === 0 ? (
                <p className="rounded-xl border border-dashed border-tulum-border px-4 py-8 text-center text-sm text-tulum-muted">
                  No hay cuentas abiertas. El salón se cobra acá, no por producto.
                </p>
              ) : (
                <div className="space-y-2">
                  {ocupadas.map((mesa) => (
                    <article
                      key={mesa.id}
                      className="rounded-xl border border-amber-400/30 bg-tulum-surface px-3 py-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-[10px] font-black text-emerald-300">
                            #{mesa.nroComprobante || mesa.id}
                          </p>
                          <h3 className="text-base font-black text-white">
                            {mesa.etiqueta || mesa.nombre || `Mesa ${mesa.numero}`}
                          </h3>
                          <p className="mt-1 text-sm text-tulum-muted">
                            {(mesa.platos || []).length > 0
                              ? mesa.platos!.join(' · ')
                              : 'Sin platos cargados'}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <p className="text-xl font-black text-white">${money(Number(mesa.totalFinal || 0))}</p>
                          <AppButton
                            icon={Wallet}
                            onClick={() => setMesaId(mesa.id)}
                          >
                            Cobrar
                          </AppButton>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {libres.length > 0 && (
              <section>
                <h2 className="mb-2 text-xs font-black uppercase tracking-wide text-tulum-muted">Libres</h2>
                <div className="flex flex-wrap gap-2">
                  {libres.map((mesa) => (
                    <button
                      key={mesa.id}
                      type="button"
                      disabled={abriendoId === mesa.id}
                      onClick={() => abrirLibre(mesa)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-950/40 px-3 py-2 text-sm font-bold text-emerald-100 hover:bg-emerald-900/50 disabled:opacity-50"
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                      {mesa.etiqueta || `Mesa ${mesa.numero}`}
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {mesaId != null && (
        <MesaCuentaPanel
          mesaId={mesaId}
          onClose={() => setMesaId(null)}
          onCambio={() => { void mutate(); }}
          onMesaCambiada={(id) => setMesaId(id)}
        />
      )}
    </div>
  );
};
