import React, { useState } from 'react';
import useSWR from 'swr';
import { AlertCircle, CircleDollarSign, Download, HandCoins, Receipt, Wallet } from 'lucide-react';
import apiClient from '../../../../api/axiosConfig';
import { ErrorAlert } from '../../../../components/ui/ErrorAlert';
import { MetricCard } from '../../../../components/ui/MetricCard';
import { RegistrarPagoModal } from './RegistrarPagoModal';
import {
  RemitoCobranza,
  RemitoEstadoPago,
  ResumenCobranzas,
  estadoPagoLabel,
  estadoPagoStyles,
  descargarRemitoPdf,
  formatFecha,
  formatMoney,
  getEstadoPago,
  getSaldoPendiente,
} from './remitosShared';

const fetcher = (url: string) => apiClient.get(url).then((res) => res.data);

type FiltroPago = 'TODOS' | RemitoEstadoPago;

const filtros: Array<{ key: FiltroPago; label: string }> = [
  { key: 'TODOS', label: 'Todos' },
  { key: 'IMPAGO', label: 'Impagos' },
  { key: 'PAGADO_PARCIAL', label: 'Pago parcial' },
  { key: 'PAGADO', label: 'Pagados' },
];

interface CobranzasPanelProps {
  remitos: RemitoCobranza[];
  onRemitosActualizados: () => Promise<any> | void;
}

export const CobranzasPanel: React.FC<CobranzasPanelProps> = ({ remitos, onRemitosActualizados }) => {
  const [filtro, setFiltro] = useState<FiltroPago>('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [remitoEnCobro, setRemitoEnCobro] = useState<RemitoCobranza | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [descargandoId, setDescargandoId] = useState<number | null>(null);

  const { data: resumen, mutate: mutateResumen } = useSWR<ResumenCobranzas>('/remitos/cobranzas/resumen', fetcher, {
    shouldRetryOnError: false,
  });
  const { data: config } = useSWR('/config', fetcher);

  const resumenLocal: ResumenCobranzas = {
    cantidadRemitos: remitos.length,
    cantidadImpagos: remitos.filter((r) => getEstadoPago(r) === 'IMPAGO').length,
    cantidadParciales: remitos.filter((r) => getEstadoPago(r) === 'PAGADO_PARCIAL').length,
    cantidadPagados: remitos.filter((r) => getEstadoPago(r) === 'PAGADO').length,
    totalFacturado: remitos.reduce((acc, r) => acc + Number(r.total || 0), 0),
    totalCobrado: remitos.reduce((acc, r) => acc + Number(r.montoPagado || 0), 0),
    totalPendiente: remitos.reduce((acc, r) => acc + getSaldoPendiente(r), 0),
  };
  const resumenVista = resumen ?? resumenLocal;

  const metodosDisponibles: string[] = [];
  if (config?.pagoEfectivoHabilitado ?? true) metodosDisponibles.push('EFECTIVO');
  if (config?.pagoTransferenciaHabilitado) metodosDisponibles.push('TRANSFERENCIA');
  if (config?.pagoMercadoPagoHabilitado) metodosDisponibles.push('MERCADO_PAGO');

  const notificar = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    window.setTimeout(() => setFeedback(null), 6000);
  };

  const remitosFiltrados = remitos
    .filter((r) => (filtro === 'TODOS' ? true : getEstadoPago(r) === filtro))
    .filter((r) => {
      const texto = busqueda.trim().toLowerCase();
      if (texto === '') return true;
      return (
        (r.nroRemito || '').toLowerCase().includes(texto) ||
        (r.nombreDestinatario || '').toLowerCase().includes(texto)
      );
    });

  const totalPendienteFiltrado = remitosFiltrados.reduce((acc, r) => acc + getSaldoPendiente(r), 0);

  const handleDescargarPdf = async (remito: RemitoCobranza) => {
    setDescargandoId(remito.id);
    try {
      await descargarRemitoPdf(remito);
    } catch (error: any) {
      notificar('error', 'No se pudo descargar el remito en PDF. ' + (error.response?.data?.message || ''));
    } finally {
      setDescargandoId(null);
    }
  };

  const handlePagoRegistrado = async (mensaje: string) => {
    setRemitoEnCobro(null);
    await Promise.all([onRemitosActualizados(), mutateResumen()]);
    notificar('success', mensaje);
  };

  return (
    <div className="space-y-6">
      {feedback && <ErrorAlert type={feedback.type} message={feedback.message} />}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Deuda total"
          value={formatMoney(resumenVista.totalPendiente)}
          helper="Saldo por cobrar de remitos"
          icon={AlertCircle}
          tone="amber"
        />
        <MetricCard
          label="Cobrado"
          value={formatMoney(resumenVista.totalCobrado)}
          helper="Cobranzas acumuladas"
          icon={Wallet}
          tone="emerald"
        />
        <MetricCard
          label="Facturado"
          value={formatMoney(resumenVista.totalFacturado)}
          helper={`${resumenVista.cantidadRemitos} remitos emitidos`}
          icon={Receipt}
          tone="blue"
        />
        <MetricCard
          label="Impagos / parciales"
          value={`${resumenVista.cantidadImpagos} / ${resumenVista.cantidadParciales}`}
          helper={`${resumenVista.cantidadPagados} remitos pagados`}
          icon={CircleDollarSign}
          tone="indigo"
        />
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex overflow-x-auto whitespace-nowrap rounded-xl border border-slate-200 bg-slate-100 p-1">
          {filtros.map((f) => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={`rounded-lg px-4 py-2 text-xs font-black transition-all ${
                filtro === f.key
                  ? 'border border-slate-200 bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex flex-1 items-center gap-3 lg:justify-end">
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nro de remito o destinatario..."
            className="w-full max-w-sm rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
          />
          <div className="hidden rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-right sm:block">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Saldo en vista</div>
            <div className="text-sm font-black text-slate-800">{formatMoney(totalPendienteFiltrado)}</div>
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4">Remito</th>
                <th className="px-6 py-4">Destinatario</th>
                <th className="px-6 py-4 text-center">Entrega</th>
                <th className="px-6 py-4 text-center">Pago</th>
                <th className="px-6 py-4 text-right">Total</th>
                <th className="px-6 py-4 text-right">Cobrado</th>
                <th className="px-6 py-4 text-right">Saldo</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {remitosFiltrados.length > 0 ? (
                remitosFiltrados.map((remito) => {
                  const estadoPago = getEstadoPago(remito);
                  const saldo = getSaldoPendiente(remito);
                  return (
                    <tr key={remito.id} className="transition-colors hover:bg-blue-50/30">
                      <td className="px-6 py-4">
                        <div className="font-mono font-black text-indigo-600">#{remito.nroRemito || remito.id}</div>
                        <div className="text-[11px] font-bold text-slate-400">{formatFecha(remito.fecha)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-black text-slate-800">{remito.nombreDestinatario || 'Sin destinatario'}</div>
                        {remito.direccionEntrega && (
                          <div className="max-w-xs truncate text-[11px] font-semibold text-slate-400">
                            {remito.direccionEntrega}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center text-[11px] font-black uppercase text-slate-500">
                        {(remito.estado || '-').replace('_', ' ')}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block rounded-lg border px-2 py-0.5 text-[10px] font-black uppercase ${estadoPagoStyles[estadoPago]}`}>
                          {estadoPagoLabel[estadoPago]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-black tabular-nums text-slate-800">
                        {formatMoney(remito.total)}
                      </td>
                      <td className="px-6 py-4 text-right font-black tabular-nums text-emerald-600">
                        {formatMoney(remito.montoPagado)}
                      </td>
                      <td className={`px-6 py-4 text-right font-black tabular-nums ${saldo > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                        {formatMoney(saldo)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setRemitoEnCobro(remito)}
                            disabled={saldo <= 0.01}
                            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[10px] font-black uppercase text-white shadow-sm transition-all hover:bg-emerald-700 disabled:opacity-40"
                            title="Registrar pago"
                          >
                            <HandCoins className="h-3.5 w-3.5" />
                            Cobrar
                          </button>
                          <button
                            onClick={() => setRemitoEnCobro(remito)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-black uppercase text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-700"
                            title="Ver historial de pagos"
                          >
                            Pagos
                          </button>
                          <button
                            onClick={() => handleDescargarPdf(remito)}
                            disabled={descargandoId === remito.id}
                            className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-[10px] font-black uppercase text-white shadow-sm transition-all hover:bg-slate-900 disabled:opacity-50"
                            title="Descargar remito en PDF"
                          >
                            <Download className="h-3.5 w-3.5" />
                            {descargandoId === remito.id ? '...' : 'PDF'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm font-semibold italic text-slate-400">
                    No hay remitos que coincidan con el filtro de cobranza seleccionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {remitoEnCobro && (
        <RegistrarPagoModal
          remito={remitoEnCobro}
          metodosDisponibles={metodosDisponibles}
          aliasCobro={config?.aliasCobro}
          onClose={() => setRemitoEnCobro(null)}
          onPagoRegistrado={handlePagoRegistrado}
        />
      )}
    </div>
  );
};
