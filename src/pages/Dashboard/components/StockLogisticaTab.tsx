import React, { useState } from 'react';
import useSWR from 'swr';
import { Boxes, Package, Plus, Search } from 'lucide-react';
import apiClient from '../../../api/axiosConfig';
import { AppButton } from '../../../components/ui/AppButton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorAlert } from '../../../components/ui/ErrorAlert';
import { PageHeader } from '../../../components/ui/PageHeader';
import { SectionCard } from '../../../components/ui/SectionCard';
import { StatusPill } from '../../../components/ui/StatusPill';
import {
  esInsumo,
  esVendible,
  formatCantidad,
  getUnidadDeProducto,
  productosDeDeposito,
} from '../../../utils/unidadMedida';
import { CreateProductForm } from './CreateProductForm';
import { MovimientosStockTab } from './MovimientosStockTab';

const fetcher = (url: string) => apiClient.get(url).then((res) => res.data);

export const StockLogisticaTab: React.FC = () => {
  const { data: productos, mutate } = useSWR('/productos', fetcher);
  const [search, setSearch] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'vendible' | 'solo'>('todos');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const deposito = productosDeDeposito(Array.isArray(productos) ? productos : []).filter((p: any) => {
    const matchNombre = (p.nombre || '').toLowerCase().includes(search.toLowerCase());
    const matchFiltro =
      filtro === 'todos'
      || (filtro === 'vendible' ? esVendible(p) : !esVendible(p));
    return matchNombre && matchFiltro;
  });

  const bajoStock = deposito.filter((p: any) => {
    const qty = Number(p.cantidadStock || 0);
    return p.stockMinimo > 0 && qty <= Number(p.stockMinimo);
  }).length;

  const formModo = editing && !esInsumo(editing) ? 'carta' : 'deposito';

  const cerrarForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const notify = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    window.setTimeout(() => setFeedback(null), 6000);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Eliminar este artículo del depósito?')) return;
    try {
      await apiClient.delete(`/productos/${id}`);
      await mutate();
      notify('success', 'Artículo eliminado.');
    } catch (error: any) {
      notify('error', error.response?.data?.message || 'No se pudo eliminar.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {feedback && <ErrorAlert type={feedback.type} message={feedback.message} />}

      <PageHeader
        description="Acá está lo que entra al depósito: fiambre, pan, limpieza y bebidas. Lo que no se vende solo sale cuando un plato de la carta lo usa en la receta."
        meta={
          <div className="flex flex-wrap gap-2">
            <StatusPill label={`${deposito.length} en depósito`} tone="blue" />
            <StatusPill label={`${bajoStock} bajo mínimo`} tone={bajoStock > 0 ? 'amber' : 'emerald'} />
          </div>
        }
        action={<AppButton icon={Plus} onClick={() => { setEditing(null); setShowForm(true); }}>Nuevo artículo</AppButton>}
      />

      {showForm || editing ? (
        <div>
          <button
            type="button"
            onClick={cerrarForm}
            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors mb-4"
          >
            Volver a Stock
          </button>
          <CreateProductForm
            modo={formModo}
            initialData={editing}
            onProductCreated={async () => {
              await mutate();
              cerrarForm();
              notify('success', 'Artículo guardado.');
            }}
            onCancelEdit={cerrarForm}
          />
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar en el depósito..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm font-bold text-slate-700 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {([
                { id: 'todos' as const, label: 'Todos' },
                { id: 'vendible' as const, label: 'Se venden' },
                { id: 'solo' as const, label: 'Solo depósito' },
              ]).map((op) => (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => setFiltro(op.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-black uppercase ${
                    filtro === op.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-500'
                  }`}
                >
                  {op.label}
                </button>
              ))}
            </div>
            <AppButton icon={Plus} onClick={() => { setEditing(null); setShowForm(true); }}>Nuevo artículo</AppButton>
          </div>

          <SectionCard
            description="Las cantidades de acá son el inventario real. Un sánguche no aparece: se arma con estos insumos."
            action={<StatusPill label={`${deposito.length} items`} tone="blue" />}
          >
            {deposito.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={Boxes}
                  title="Todavía no hay stock cargado"
                  description="Cargá fiambre, bebidas o limpieza. Si es una Coca, marcá Se vende para que salga en la carta."
                  action={<AppButton icon={Plus} onClick={() => setShowForm(true)}>Nuevo artículo</AppButton>}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400 font-black">
                    <tr>
                      <th className="px-6 py-4">Artículo</th>
                      <th className="px-6 py-4">Categoría</th>
                      <th className="px-6 py-4 text-center">Stock</th>
                      <th className="px-6 py-4 text-center">Mínimo</th>
                      <th className="px-6 py-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {deposito.map((col: any, index: number) => {
                      const qty = Number(col.cantidadStock || 0);
                      const min = Number(col.stockMinimo || 0);
                      const tone = qty <= 0 ? 'red' : min > 0 && qty <= min ? 'amber' : 'emerald';
                      return (
                        <tr key={col.id} className={`transition-colors hover:bg-blue-50/30 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {col.imageUrl ? (
                                <img src={col.imageUrl} alt={col.nombre} className="w-12 h-12 rounded-xl object-cover border border-slate-200" />
                              ) : (
                                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                                  <Package className="h-5 w-5" />
                                </div>
                              )}
                              <div>
                                <div className="font-black text-slate-900">{col.nombre}</div>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {esVendible(col) ? (
                                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-700">
                                      En carta
                                    </span>
                                  ) : (
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase text-slate-500">
                                      Solo depósito
                                    </span>
                                  )}
                                  {!esInsumo(col) && (
                                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black uppercase text-amber-700">
                                      Sin receta
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-500">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                              {col.categoria?.nombre || '—'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <StatusPill
                              label={formatCantidad(qty, getUnidadDeProducto(col))}
                              tone={tone}
                            />
                          </td>
                          <td className="px-6 py-4 text-center text-sm font-semibold text-slate-500">
                            {min > 0 ? formatCantidad(min, getUnidadDeProducto(col)) : '—'}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditing(col);
                                  setShowForm(true);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
                                title="Editar"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(col.id)}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                title="Eliminar"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <MovimientosStockTab compact />
        </>
      )}
    </div>
  );
};
