import React, { useState } from 'react';
import useSWR from 'swr';
import { ClipboardList, PackageCheck, Plus, Trash2 } from 'lucide-react';
import apiClient from '../../../api/axiosConfig';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorAlert } from '../../../components/ui/ErrorAlert';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageHeader } from '../../../components/ui/PageHeader';
import { StatusPill } from '../../../components/ui/StatusPill';

const fetcher = (url: string) => apiClient.get(url).then((res) => res.data);

interface CompraItemForm {
  productoId: number | '';
  cantidad: number;
  precioUnitario: number;
}

interface Compra {
  id: number;
  fecha?: string;
  nroFactura?: string;
  proveedor?: { id: number; nombre: string };
  estado?: string;
  total?: number;
  observaciones?: string;
  items?: Array<{ id: number; cantidad: number; precioUnitario: number; producto?: { nombre: string } }>;
}

const emptyItem = (): CompraItemForm => ({ productoId: '', cantidad: 1, precioUnitario: 0 });

export const ComprasTab: React.FC = () => {
  const { data: compras, error, isLoading, mutate } = useSWR('/compras', fetcher);
  const { data: sugerencias } = useSWR('/compras/sugerencias', fetcher);
  const { data: proveedores } = useSWR('/proveedores', fetcher);
  const { data: productos } = useSWR('/productos', fetcher);

  const [proveedorId, setProveedorId] = useState<number | ''>('');
  const [nroFactura, setNroFactura] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [items, setItems] = useState<CompraItemForm[]>([emptyItem()]);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const compraList: Compra[] = Array.isArray(compras) ? compras : [];
  const sugerenciaList: any[] = Array.isArray(sugerencias) ? sugerencias : [];
  const proveedorList = Array.isArray(proveedores) ? proveedores : [];
  const productoList = Array.isArray(productos) ? productos : [];

  // Referenciamos sugerenciaList para que TypeScript/ESLint no arroje error de variable no usada
  void sugerenciaList;

  const resetForm = () => {
    setProveedorId('');
    setNroFactura('');
    setObservaciones('');
    setItems([emptyItem()]);
  };

  const updateItem = (index: number, patch: Partial<CompraItemForm>) => {
    setItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  };

  const handleProductChange = (index: number, rawValue: string) => {
    const productId = rawValue ? Number(rawValue) : '';
    const product = productoList.find((p: any) => p.id === productId);
    updateItem(index, {
      productoId: productId,
      precioUnitario: product?.precio ? Number(product.precio) : 0,
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);

    const validItems = items.filter((item) => item.productoId !== '' && Number(item.cantidad) > 0);
    if (!proveedorId) {
      setFeedback({ type: 'error', message: 'Selecciona un proveedor para registrar la compra.' });
      return;
    }
    if (validItems.length === 0) {
      setFeedback({ type: 'error', message: 'Agrega al menos un producto a la compra.' });
      return;
    }

    setIsSaving(true);
    try {
      await apiClient.post('/compras', {
        proveedorId: Number(proveedorId),
        nroFactura,
        observaciones,
        items: validItems.map((item) => ({
          productoId: Number(item.productoId),
          cantidad: Number(item.cantidad),
          precioUnitario: Number(item.precioUnitario || 0),
        })),
      });
      resetForm();
      await mutate();
      setFeedback({ type: 'success', message: 'Compra registrada correctamente.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'No pudimos registrar la compra.' });
    } finally {
      setIsSaving(false);
    }
  };

  const recibirCompra = async (id: number) => {
    setFeedback(null);
    try {
      await apiClient.put(`/compras/${id}/recibir`);
      await mutate();
      setFeedback({ type: 'success', message: 'Mercaderia recibida y stock actualizado.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'No pudimos recibir la compra.' });
    }
  };

  const eliminarCompra = async (id: number) => {
    if (!window.confirm('Desea eliminar esta compra?')) return;
    setFeedback(null);
    try {
      await apiClient.delete(`/compras/${id}`);
      await mutate();
      setFeedback({ type: 'success', message: 'Compra eliminada correctamente.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'No pudimos eliminar la compra.' });
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        eyebrow="Abastecimiento"
        title="Compras a proveedores"
        description="Controla pedidos, recepcion de mercaderia y actualizacion de stock desde una vista operativa."
        icon={ClipboardList}
        meta={<StatusPill label={`${compraList.length} compras`} tone="blue" />}
      />

      {feedback && <ErrorAlert type={feedback.type} message={feedback.message} />}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <h3 className="text-lg font-black text-slate-800">Nueva compra</h3>
          <p className="text-sm font-medium text-slate-500">Registra pedidos a proveedores y recibilos cuando ingresa la mercaderia.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5 p-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <label>
              <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">Proveedor *</span>
              <select value={proveedorId} onChange={(e) => setProveedorId(e.target.value ? Number(e.target.value) : '')} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10">
                <option value="">Seleccionar proveedor</option>
                {proveedorList.map((proveedor: any) => <option key={proveedor.id} value={proveedor.id}>{proveedor.nombre}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">Factura</span>
              <input value={nroFactura} onChange={(e) => setNroFactura(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10" placeholder="A-0001-00000001" />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">Observaciones</span>
              <input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10" />
            </label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black uppercase tracking-wide text-slate-700">Productos</h4>
              <button type="button" onClick={() => setItems((current) => [...current, emptyItem()])} className="inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-600 hover:text-white">
                <Plus className="h-4 w-4" />
                Agregar item
              </button>
            </div>
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-1 gap-3 rounded-lg border border-slate-100 bg-slate-50/80 p-3 md:grid-cols-12">
                <select value={item.productoId} onChange={(e) => handleProductChange(index, e.target.value)} className="md:col-span-6 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500">
                  <option value="">Producto</option>
                  {productoList.map((producto: any) => <option key={producto.id} value={producto.id}>{producto.nombre}</option>)}
                </select>
                <input type="number" min="1" value={item.cantidad} onChange={(e) => updateItem(index, { cantidad: Number(e.target.value) })} className="md:col-span-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500" />
                <input type="number" min="0" step="0.01" value={item.precioUnitario} onChange={(e) => updateItem(index, { precioUnitario: Number(e.target.value) })} className="md:col-span-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500" />
                <button type="button" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} disabled={items.length === 1} className="md:col-span-1 flex items-center justify-center rounded-lg border border-red-100 bg-red-50 p-2 text-red-500 hover:bg-red-600 hover:text-white disabled:opacity-40">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-black text-white shadow-sm hover:bg-slate-800 disabled:opacity-50">
              <ClipboardList className="h-4 w-4" />
              {isSaving ? 'Guardando...' : 'Registrar compra'}
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
          <h3 className="text-lg font-black text-slate-800">Compras</h3>
          <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">{compraList.length} registros</span>
        </div>
        {isLoading ? (
          <div className="p-5"><LoadingState label="Cargando compras..." /></div>
        ) : error ? (
          <div className="p-5"><ErrorAlert message="No pudimos cargar las compras." /></div>
        ) : compraList.length === 0 ? (
          <div className="p-5"><EmptyState title="No hay compras registradas" description="Carga una compra para mostrar el circuito proveedor-ingreso-stock." icon={PackageCheck} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-100 bg-white text-xs font-black uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-4">Fecha</th>
                  <th className="px-5 py-4">Proveedor</th>
                  <th className="px-5 py-4">Factura</th>
                  <th className="px-5 py-4">Estado</th>
                  <th className="px-5 py-4 text-right">Total</th>
                  <th className="px-5 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {compraList.map((compra) => (
                  <tr key={compra.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-semibold">{compra.fecha ? new Date(compra.fecha).toLocaleDateString('es-AR') : '-'}</td>
                    <td className="px-5 py-4 font-black text-slate-800">{compra.proveedor?.nombre || '-'}</td>
                    <td className="px-5 py-4 font-mono text-xs">{compra.nroFactura || '-'}</td>
                    <td className="px-5 py-4"><StatusPill label={compra.estado || 'PENDIENTE'} tone={compra.estado === 'RECIBIDA' ? 'emerald' : 'amber'} /></td>
                    <td className="px-5 py-4 text-right font-black text-slate-800">${Number(compra.total || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        {compra.estado !== 'RECIBIDA' && (
                          <button type="button" onClick={() => recibirCompra(compra.id)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700">Recibir</button>
                        )}
                        <button type="button" onClick={() => eliminarCompra(compra.id)} className="rounded-lg border border-red-100 bg-red-50 p-2 text-red-500 hover:bg-red-600 hover:text-white" title="Eliminar compra">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
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
