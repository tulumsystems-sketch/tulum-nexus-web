import React, { useEffect, useState } from 'react';
import useSWR from 'swr';
import { Clock, LayoutGrid, Plus, Settings2, Trash2, UtensilsCrossed } from 'lucide-react';
import apiClient from '../../../api/axiosConfig';
import { AppButton } from '../../../components/ui/AppButton';
import { ErrorAlert } from '../../../components/ui/ErrorAlert';
import { PageHeader } from '../../../components/ui/PageHeader';
import { MesaCuentaPanel } from './MesaCuentaPanel';

const fetcher = (url: string) => apiClient.get(url).then((res) => res.data);

interface Mesa {
  id: number;
  numero: number;
  nombre?: string;
  etiqueta?: string;
  capacidad?: number;
  activa: boolean;
  estado: 'LIBRE' | 'OCUPADA' | string;
  ventaId?: number;
  nroComprobante?: string;
  totalFinal?: number;
  abiertaDesde?: string;
  cobrado?: boolean;
  estadoCuenta?: string;
  platos?: string[];
}

const haceTiempo = (fecha?: string, ahora = Date.now()): string => {
  if (!fecha) return '';
  const minutos = Math.max(0, Math.floor((ahora - new Date(fecha).getTime()) / 60000));
  if (minutos < 1) return 'recién';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  return `hace ${Math.floor(horas / 24)} d`;
};

const labelCocina = (estado?: string): string => {
  switch (estado) {
    case 'PENDIENTE':
      return 'Cocina: pendiente';
    case 'EN_PREPARACION':
      return 'Cocina: preparando';
    case 'LISTO':
      return 'Cocina: listo';
    default:
      return '';
  }
};

export const MesasTab: React.FC = () => {
  const { data, error, isLoading, mutate } = useSWR('/mesas', fetcher, { refreshInterval: 10000 });
  const [ahora, setAhora] = useState(Date.now());
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [abriendoId, setAbriendoId] = useState<number | null>(null);
  const [mesaAbiertaId, setMesaAbiertaId] = useState<number | null>(null);
  const [configAbierta, setConfigAbierta] = useState(false);
  const [numero, setNumero] = useState('');
  const [nombre, setNombre] = useState('');
  const [loteDesde, setLoteDesde] = useState('1');
  const [loteHasta, setLoteHasta] = useState('12');
  const [guardando, setGuardando] = useState(false);

  const mesas: Mesa[] = Array.isArray(data) ? data.filter((m: Mesa) => m.activa !== false) : [];
  const ocupadas = mesas.filter((m) => m.estado === 'OCUPADA').length;

  useEffect(() => {
    const timer = window.setInterval(() => setAhora(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const abrirCuenta = async (mesa: Mesa) => {
    if (mesa.estado === 'OCUPADA') {
      setMesaAbiertaId(mesa.id);
      return;
    }
    setAbriendoId(mesa.id);
    setFeedback(null);
    try {
      await apiClient.post(`/mesas/${mesa.id}/abrir`);
      await mutate();
      setMesaAbiertaId(mesa.id);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'No se pudo abrir la mesa. ¿La caja está abierta?',
      });
    } finally {
      setAbriendoId(null);
    }
  };

  const crearMesa = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setFeedback(null);
    try {
      await apiClient.post('/mesas', {
        numero: Number(numero),
        nombre: nombre.trim() || null,
      });
      setNumero('');
      setNombre('');
      await mutate();
      setFeedback({ type: 'success', message: 'Mesa creada.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'No se pudo crear la mesa.' });
    } finally {
      setGuardando(false);
    }
  };

  const crearLote = async () => {
    setGuardando(true);
    setFeedback(null);
    try {
      const creadas = await apiClient.post('/mesas/lote', {
        desde: Number(loteDesde),
        hasta: Number(loteHasta),
      });
      await mutate();
      const n = Array.isArray(creadas.data) ? creadas.data.length : 0;
      setFeedback({
        type: 'success',
        message: n === 0 ? 'Esas mesas ya existían.' : `Se crearon ${n} mesas.`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'No se pudo crear el lote.' });
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (mesa: Mesa) => {
    if (mesa.estado === 'OCUPADA') {
      setFeedback({ type: 'error', message: 'Esa mesa tiene cuenta abierta. Cobrálas o anulala antes de borrarla.' });
      return;
    }
    if (!window.confirm(`¿Eliminar ${mesa.etiqueta || `Mesa ${mesa.numero}`}?`)) return;
    try {
      await apiClient.delete(`/mesas/${mesa.id}`);
      await mutate();
      setFeedback({ type: 'success', message: `${mesa.etiqueta || `Mesa ${mesa.numero}`} eliminada.` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'No se pudo eliminar.' });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        description="Salón: abrí mesa, cargá carta y cobrá. Los platos salen en Pedidos."
        action={
          <AppButton icon={Settings2} variant="secondary" onClick={() => setConfigAbierta((v) => !v)}>
            {configAbierta ? 'Cerrar config' : 'Configurar mesas'}
          </AppButton>
        }
        meta={
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
              {mesas.length - ocupadas} libres
            </span>
            <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-100">
              {ocupadas} ocupadas
            </span>
          </div>
        }
      />

      {feedback && <ErrorAlert type={feedback.type} message={feedback.message} />}
      {error && <ErrorAlert message="No pudimos cargar las mesas. ¿Está activo el módulo MESAS?" />}

      {configAbierta && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-300">Alta rápida</h3>
          <form onSubmit={crearMesa} className="mb-4 flex flex-wrap gap-2">
            <input
              type="number"
              min={1}
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="Nº"
              required
              className="w-24 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre opcional (VIP, terraza…)"
              className="min-w-[200px] flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
            <AppButton type="submit" icon={Plus} disabled={guardando}>Agregar</AppButton>
          </form>
          <div className="flex flex-wrap items-end gap-2 border-t border-slate-800 pt-4">
            <label className="text-xs font-bold text-slate-400">
              Desde
              <input
                type="number"
                min={1}
                value={loteDesde}
                onChange={(e) => setLoteDesde(e.target.value)}
                className="mt-1 block w-20 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="text-xs font-bold text-slate-400">
              Hasta
              <input
                type="number"
                min={1}
                value={loteHasta}
                onChange={(e) => setLoteHasta(e.target.value)}
                className="mt-1 block w-20 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </label>
            <AppButton type="button" variant="secondary" icon={LayoutGrid} disabled={guardando} onClick={crearLote}>
              Crear lote
            </AppButton>
          </div>
          {mesas.length > 0 && (
            <ul className="mt-4 max-h-40 space-y-1 overflow-y-auto text-sm text-slate-400">
              {mesas.map((m) => (
                <li key={m.id} className="flex items-center justify-between rounded-lg px-2 py-1 hover:bg-slate-950">
                  <span>{m.etiqueta || `Mesa ${m.numero}`}</span>
                  <button
                    type="button"
                    onClick={() => eliminar(m)}
                    disabled={m.estado === 'OCUPADA'}
                    title={m.estado === 'OCUPADA' ? 'Cuenta abierta: cobrá o anulá antes' : 'Eliminar mesa'}
                    className="text-red-400 hover:text-red-300 disabled:cursor-not-allowed disabled:text-slate-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center text-sm font-bold text-slate-400">
          Cargando mesas...
        </div>
      ) : mesas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-12 text-center">
          <UtensilsCrossed className="mx-auto mb-3 h-10 w-10 text-slate-600" />
          <p className="text-lg font-black text-white">Todavía no hay mesas</p>
          <p className="mt-2 text-sm text-slate-400">Abrí Configurar mesas y creá el lote 1–12 para la demo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
          {mesas.map((mesa) => {
            const ocupada = mesa.estado === 'OCUPADA';
            return (
              <button
                key={mesa.id}
                type="button"
                disabled={abriendoId === mesa.id}
                onClick={() => abrirCuenta(mesa)}
                className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${
                  ocupada
                    ? 'border-amber-400/40 bg-amber-950/40 shadow-lg shadow-amber-900/20'
                    : 'border-emerald-400/30 bg-emerald-950/30 hover:border-emerald-300/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-2xl font-black text-white">{mesa.numero}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                      ocupada
                        ? 'bg-amber-500/20 text-amber-100'
                        : 'bg-emerald-500/20 text-emerald-100'
                    }`}
                  >
                    {ocupada ? 'Ocupada' : 'Libre'}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs font-bold text-slate-300">
                  {mesa.nombre || mesa.etiqueta || `Mesa ${mesa.numero}`}
                </p>
                {ocupada ? (
                  <div className="mt-3 space-y-1 text-xs text-slate-300">
                    <p className="font-mono font-black text-amber-100">{mesa.nroComprobante || `#${mesa.ventaId}`}</p>
                    <p className="font-black text-white">
                      ${Number(mesa.totalFinal || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </p>
                    {(mesa.platos || []).length > 0 && (
                      <p className="line-clamp-2 text-[11px] font-semibold text-slate-400">{mesa.platos!.join(' · ')}</p>
                    )}
                    {mesa.abiertaDesde && (
                      <p className="inline-flex items-center gap-1 text-slate-400">
                        <Clock className="h-3 w-3" />
                        {haceTiempo(mesa.abiertaDesde, ahora)}
                      </p>
                    )}
                    {labelCocina(mesa.estadoCuenta) && (
                      <p className="font-bold text-emerald-200/90">{labelCocina(mesa.estadoCuenta)}</p>
                    )}
                  </div>
                ) : (
                  <p className="mt-3 text-xs font-semibold text-emerald-200/80">Tocá para abrir y cargar</p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {mesaAbiertaId != null && (
        <MesaCuentaPanel
          mesaId={mesaAbiertaId}
          onClose={() => setMesaAbiertaId(null)}
          onCambio={() => { void mutate(); }}
          onMesaCambiada={(id) => {
            setMesaAbiertaId(id);
            void mutate();
          }}
        />
      )}
    </div>
  );
};
