import React, { useState } from 'react';
import useSWR from 'swr';
import { Boxes } from 'lucide-react';
import apiClient from '../../../api/axiosConfig';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorAlert } from '../../../components/ui/ErrorAlert';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageHeader } from '../../../components/ui/PageHeader';
import { StatusPill } from '../../../components/ui/StatusPill';

const fetcher = (url: string) => apiClient.get(url).then((res) => res.data);

interface StockMovement {
  id: number;
  tipoMovimiento: string;
  producto?: { id: number; nombre: string };
  usuario?: { email?: string; nombre?: string };
  cantidad: number;
  fecha?: string;
  motivo?: string;
  venta?: { id: number; nroComprobante?: string };
  compra?: { id: number; nroFactura?: string };
  remito?: { id: number; nroRemito?: string };
}

const movementTypes = ['', 'VENTA', 'COMPRA', 'AJUSTE', 'TRANSFERENCIA'];

const getMovementTone = (type: string) => {
  if (type === 'COMPRA') return 'emerald';
  if (type === 'VENTA' || type === 'TRANSFERENCIA') return 'blue';
  if (type === 'AJUSTE') return 'amber';
  return 'slate';
};

const getSource = (movement: StockMovement) => {
  if (movement.venta) return `Venta #${movement.venta.nroComprobante || movement.venta.id}`;
  if (movement.compra) return `Compra #${movement.compra.nroFactura || movement.compra.id}`;
  if (movement.remito) return `Remito #${movement.remito.nroRemito || movement.remito.id}`;
  return '-';
};

export const MovimientosStockTab: React.FC = () => {
  const [tipoMovimiento, setTipoMovimiento] = useState('');
  const endpoint = tipoMovimiento ? `/stock-movements?tipoMovimiento=${tipoMovimiento}` : '/stock-movements';
  const { data, error, isLoading } = useSWR(endpoint, fetcher);
  const movements: StockMovement[] = Array.isArray(data) ? data : [];

  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        eyebrow="Inventario trazable"
        title="Movimientos de stock"
        description="Lee entradas, salidas, ajustes y referencias operativas con una tabla preparada para auditoria."
        icon={Boxes}
        meta={<StatusPill label={`${movements.length} movimientos`} tone="blue" />}
      />

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-800">Movimientos de stock</h3>
            <p className="text-sm font-medium text-slate-500">Trazabilidad de entradas, salidas y ajustes del inventario.</p>
          </div>
          <label className="w-full sm:w-64">
            <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">Tipo</span>
            <select value={tipoMovimiento} onChange={(e) => setTipoMovimiento(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10">
              {movementTypes.map((type) => <option key={type || 'TODOS'} value={type}>{type || 'TODOS'}</option>)}
            </select>
          </label>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
          <h3 className="text-lg font-black text-slate-800">Historial</h3>
          <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">{movements.length} movimientos</span>
        </div>

        {isLoading ? (
          <div className="p-5"><LoadingState label="Cargando movimientos..." /></div>
        ) : error ? (
          <div className="p-5"><ErrorAlert message="No pudimos cargar los movimientos de stock." /></div>
        ) : movements.length === 0 ? (
          <div className="p-5">
            <EmptyState title="Sin movimientos para mostrar" description="Cuando haya ventas, compras, remitos o ajustes, apareceran en esta vista." icon={Boxes} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-100 bg-white text-xs font-black uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-4">Fecha</th>
                  <th className="px-5 py-4">Tipo</th>
                  <th className="px-5 py-4">Producto</th>
                  <th className="px-5 py-4 text-center">Cantidad</th>
                  <th className="px-5 py-4">Origen</th>
                  <th className="px-5 py-4">Usuario</th>
                  <th className="px-5 py-4">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.map((movement) => (
                  <tr key={movement.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-semibold">{movement.fecha ? new Date(movement.fecha).toLocaleString('es-AR') : '-'}</td>
                    <td className="px-5 py-4"><StatusPill label={movement.tipoMovimiento} tone={getMovementTone(movement.tipoMovimiento)} /></td>
                    <td className="px-5 py-4 font-black text-slate-800">{movement.producto?.nombre || '-'}</td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex min-w-10 justify-center rounded-md bg-slate-100 px-2 py-1 font-black text-slate-800">{movement.cantidad}</span>
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-500">{getSource(movement)}</td>
                    <td className="px-5 py-4 text-xs font-semibold text-slate-500">{movement.usuario?.email || movement.usuario?.nombre || '-'}</td>
                    <td className="px-5 py-4 max-w-sm truncate">{movement.motivo || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
