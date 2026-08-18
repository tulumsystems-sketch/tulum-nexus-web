import React, { useState } from 'react';
import useSWR from 'swr';
import { X } from 'lucide-react';
import apiClient from '../../../../api/axiosConfig';
import { ErrorAlert } from '../../../../components/ui/ErrorAlert';
import {
  PagoRemito,
  RemitoCobranza,
  estadoPagoLabel,
  estadoPagoStyles,
  formatFechaHora,
  formatMoney,
  getEstadoPago,
  getSaldoPendiente,
  metodoPagoLabel,
} from './remitosShared';

const fetcher = (url: string) => apiClient.get(url).then((res) => res.data);

interface RegistrarPagoModalProps {
  remito: RemitoCobranza;
  /** Metodos habilitados en la configuracion del negocio. */
  metodosDisponibles: string[];
  aliasCobro?: string;
  onClose: () => void;
  onPagoRegistrado: (mensaje: string) => void;
}

export const RegistrarPagoModal: React.FC<RegistrarPagoModalProps> = ({
  remito,
  metodosDisponibles,
  aliasCobro,
  onClose,
  onPagoRegistrado,
}) => {
  const saldo = getSaldoPendiente(remito);
  const estadoPago = getEstadoPago(remito);
  const metodos = metodosDisponibles.length > 0 ? metodosDisponibles : ['EFECTIVO'];

  const [monto, setMonto] = useState<number | ''>(saldo > 0 ? Number(saldo.toFixed(2)) : '');
  const [metodoPago, setMetodoPago] = useState<string>(metodos[0]);
  const [observaciones, setObservaciones] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: pagos, mutate: mutatePagos } = useSWR<PagoRemito[]>(`/remitos/${remito.id}/pagos`, fetcher);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const montoNumerico = Number(monto);
    if (!montoNumerico || montoNumerico <= 0) {
      setError('Ingresa un monto mayor a cero.');
      return;
    }
    if (montoNumerico > saldo + 0.01) {
      setError(`El monto no puede superar el saldo pendiente (${formatMoney(saldo)}).`);
      return;
    }

    setIsSaving(true);
    try {
      await apiClient.post(`/remitos/${remito.id}/pagos`, {
        monto: montoNumerico,
        metodoPago,
        observaciones: observaciones.trim() === '' ? null : observaciones.trim(),
      });
      await mutatePagos();
      onPagoRegistrado(
        `Pago de ${formatMoney(montoNumerico)} registrado en el remito #${remito.nroRemito || remito.id}.`,
      );
    } catch (err: any) {
      setError(err.response?.data?.message || 'No se pudo registrar el pago. Intenta nuevamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cobranza de remito</p>
            <h2 className="text-lg font-black tracking-tight text-slate-800">
              #{remito.nroRemito || remito.id} - {remito.nombreDestinatario || 'Sin destinatario'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            title="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total</div>
              <div className="mt-1 text-lg font-black text-slate-800">{formatMoney(remito.total)}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cobrado</div>
              <div className="mt-1 text-lg font-black text-emerald-600">{formatMoney(remito.montoPagado)}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Saldo</div>
              <div className="mt-1 text-lg font-black text-red-600">{formatMoney(saldo)}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`inline-block rounded-lg border px-2 py-0.5 text-[10px] font-black uppercase ${estadoPagoStyles[estadoPago]}`}>
              {estadoPagoLabel[estadoPago]}
            </span>
            {aliasCobro && (
              <span className="text-xs font-bold text-slate-500">Alias para transferencias: {aliasCobro}</span>
            )}
          </div>

          {error && <ErrorAlert type="error" message={error} />}

          {saldo > 0.01 ? (
            <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">
                    Monto a cobrar *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value === '' ? '' : Number(e.target.value))}
                    disabled={isSaving}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    placeholder="0.00"
                  />
                  <button
                    type="button"
                    onClick={() => setMonto(Number(saldo.toFixed(2)))}
                    className="mt-1.5 text-[11px] font-black uppercase text-blue-600 hover:text-blue-700"
                  >
                    Usar saldo total
                  </button>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">
                    Medio de pago *
                  </label>
                  <select
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                    disabled={isSaving}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  >
                    {metodos.map((m) => (
                      <option key={m} value={m}>
                        {metodoPagoLabel(m)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">
                  Observaciones
                </label>
                <input
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  disabled={isSaving}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  placeholder="Ej: entrego el hijo, comprobante 1234..."
                />
              </div>

              <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] font-semibold text-blue-700">
                Las cobranzas en efectivo requieren caja abierta y suman al efectivo esperado del cajon, pero se
                registran aparte de las ventas del dia.
              </p>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-600 transition-all hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isSaving ? 'Registrando...' : 'Registrar pago'}
                </button>
              </div>
            </form>
          ) : (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
              Este remito ya esta cobrado en su totalidad.
            </div>
          )}

          <div>
            <h3 className="mb-3 text-sm font-black uppercase tracking-tight text-slate-700">Historial de pagos</h3>
            {Array.isArray(pagos) && pagos.length > 0 ? (
              <ul className="space-y-2">
                {pagos.map((pago) => (
                  <li
                    key={pago.id}
                    className="flex items-start justify-between gap-4 rounded-xl border border-slate-100 bg-white px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-black text-slate-800">{metodoPagoLabel(pago.metodoPago)}</div>
                      <div className="text-[11px] font-bold text-slate-400">{formatFechaHora(pago.fecha)}</div>
                      {pago.observaciones && (
                        <div className="mt-0.5 truncate text-[11px] italic text-slate-500">{pago.observaciones}</div>
                      )}
                      {pago.usuarioEmail && (
                        <div className="text-[10px] font-bold uppercase text-slate-300">{pago.usuarioEmail}</div>
                      )}
                    </div>
                    <div className="text-right font-black tabular-nums text-emerald-600">{formatMoney(pago.monto)}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm font-semibold text-slate-400">
                Todavia no se registraron pagos para este remito.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
