import React, { useState } from 'react';
import useSWR from 'swr';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import apiClient from '../../../api/axiosConfig';

const fetcher = (url: string) => apiClient.get(url).then((res) => res.data);

type RemitoStatus = 'PENDIENTE' | 'EN_VIAJE' | 'ENTREGADO' | 'INCIDENCIA';

interface RemitoItem {
  productoId: number | string;
  cantidad: number;
  descripcion: string;
}

interface RemitoFormInputs {
  clienteId: number | string;
  direccionEntrega: string;
  nombreDestinatario: string;
  telefonoDestinatario: string;
  observaciones: string;
  items: RemitoItem[];
}

interface Remito {
  id: number;
  nroRemito: string;
  cliente?: { nombre: string; apellido: string };
  direccionEntrega: string;
  nombreDestinatario: string;
  telefonoDestinatario: string;
  estado: RemitoStatus;
  fecha: string;
  observaciones: string;
  items: Array<{
    id: number;
    cantidad: number;
    descripcion: string;
    producto?: { nombre: string };
  }>;
}

export const RemitosTab: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<RemitoStatus | 'TODOS'>('TODOS');
  const [isSubmittingRemito, setIsSubmittingRemito] = useState(false);

  // Data fetching
  const { data: clientes } = useSWR('/clientes', fetcher);
  const { data: productos } = useSWR('/productos', fetcher);
  const { data: remitos, mutate: mutateRemitos } = useSWR('/remitos', fetcher);

  const { register, control, handleSubmit, reset } = useForm<RemitoFormInputs>({
    defaultValues: {
      items: [{ productoId: '', cantidad: 1, descripcion: '' }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const onSubmit: SubmitHandler<RemitoFormInputs> = async (data) => {
    setIsSubmittingRemito(true);
    try {
      await apiClient.post('/remitos', {
        ...data,
        clienteId: data.clienteId === '' ? null : Number(data.clienteId),
        items: data.items.map(item => ({
          ...item,
          productoId: item.productoId === '' ? null : Number(item.productoId),
          cantidad: Number(item.cantidad)
        }))
      });
      reset();
      await mutateRemitos();
      alert('Remito creado con éxito.');
    } catch (error: any) {
      console.error(error);
      alert('Error al crear el remito: ' + (error.response?.data?.message || 'Error desconocido'));
    } finally {
      setIsSubmittingRemito(false);
    }
  };

  const updateEstado = async (id: number, nuevoEstado: RemitoStatus) => {
    try {
      await apiClient.put(`/remitos/${id}/estado?estado=${nuevoEstado}`);
      await mutateRemitos();
    } catch (error: any) {
      console.error(error);
      alert('Error al actualizar el estado: ' + (error.response?.data?.message || 'Error desconocido'));
    }
  };

  const filteredRemitos = Array.isArray(remitos)
    ? (activeFilter === 'TODOS' ? remitos : remitos.filter((r: Remito) => r.estado === activeFilter))
    : [];

  const getStatusStyles = (status: RemitoStatus) => {
    switch (status) {
      case 'PENDIENTE': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'EN_VIAJE': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'ENTREGADO': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'INCIDENCIA': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">

      {/* SECCIÓN 1: FORMULARIO DE CREACIÓN */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-4 py-4 sm:px-8 sm:py-5 border-b border-slate-200">
          <h3 className="text-xl font-bold text-slate-800">Generar Nuevo Remito</h3>
          <p className="text-sm text-slate-500 mt-1">Completa los datos de envío y carga los productos de la hoja de ruta.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-8 space-y-6 sm:space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="lg:col-span-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Cliente</label>
              <select
                {...register('clienteId')}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
              >
                <option value="">Seleccionar Cliente (Opcional)</option>
                {clientes?.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Dirección de Entrega *</label>
              <input
                {...register('direccionEntrega', { required: true })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                placeholder="Calle 123, Ciudad"
              />
            </div>

            <div className="lg:col-span-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Destinatario *</label>
              <input
                {...register('nombreDestinatario', { required: true })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                placeholder="Nombre Completo"
              />
            </div>

            <div className="lg:col-span-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Teléfono</label>
              <input
                {...register('telefonoDestinatario')}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                placeholder="+54 9 11..."
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Observaciones</label>
            <textarea
              {...register('observaciones')}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all min-h-[80px]"
              placeholder="Notas para el transportista o referencias..."
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-sm font-black text-slate-700 uppercase tracking-tighter">Ítems del Remito</h4>
              <button
                type="button"
                onClick={() => append({ productoId: '', cantidad: 1, descripcion: '' })}
                className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-600 hover:text-white transition-all border border-blue-100"
              >
                + Agregar Producto
              </button>
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                  <div className="md:col-span-4">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Producto</label>
                    <select
                      {...register(`items.${index}.productoId` as const)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none"
                    >
                      <option value="">Seleccionar...</option>
                      {productos?.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Cant.</label>
                    <input
                      type="number"
                      {...register(`items.${index}.cantidad` as const, { valueAsNumber: true })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none"
                    />
                  </div>
                  <div className="md:col-span-5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Descripción / Variedad</label>
                    <input
                      {...register(`items.${index}.descripcion` as const)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none"
                      placeholder="Ej: Color azul, talle L..."
                    />
                  </div>
                  <div className="md:col-span-1">
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="w-full p-2 text-red-400 hover:text-red-600 bg-red-50 rounded-lg transition-colors border border-red-100 flex items-center justify-center"
                      title="Quitar ítem"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={isSubmittingRemito}
              className="px-10 py-3 bg-slate-800 text-white font-black rounded-xl hover:bg-slate-900 transition-all shadow-lg shadow-slate-200 disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmittingRemito ? 'Generando...' : 'Crear Remito Oficial'}
            </button>
          </div>
        </form>
      </section>

      {/* SECCIÓN 2: LISTADO DE REMITOS */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            Hojas de Ruta & Seguimiento
            <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{filteredRemitos.length}</span>
          </h3>

          <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200 overflow-x-auto whitespace-nowrap">
            {(['TODOS', 'PENDIENTE', 'EN_VIAJE', 'ENTREGADO', 'INCIDENCIA'] as const).map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-2 text-xs font-black rounded-lg transition-all ${activeFilter === filter
                    ? 'bg-white text-slate-800 shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                {filter.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRemitos.length > 0 ? filteredRemitos.map((r: Remito) => (
            <div key={r.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-black text-slate-400">#{r.nroRemito || r.id}</h4>
                    <span className={`mt-1 inline-block px-2 py-0.5 text-[10px] font-black uppercase rounded-lg border ${getStatusStyles(r.estado)}`}>
                      {r.estado.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-right text-[10px] font-bold text-slate-400 uppercase">
                    {new Date(r.fecha).toLocaleDateString('es-AR')}
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-black text-slate-800 truncate">{r.nombreDestinatario}</p>
                  <p className="text-xs font-medium text-slate-500 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    {r.direccionEntrega}
                  </p>
                  {r.telefonoDestinatario && <p className="text-xs font-medium text-slate-400">Móvil: {r.telefonoDestinatario}</p>}
                </div>

                <div className="pt-3 border-t border-slate-50">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Ítems:</p>
                  <ul className="space-y-1 text-xs">
                    {r.items.map(item => (
                      <li key={item.id} className="text-slate-600 font-medium">
                        <span className="font-black text-slate-800 mr-1">{item.cantidad}x</span>
                        {item.producto?.nombre || 'Producto'} <span className="text-[10px] italic text-slate-400">{item.descripcion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex gap-2">
                {r.estado === 'PENDIENTE' && (
                  <button
                    onClick={() => updateEstado(r.id, 'EN_VIAJE')}
                    className="flex-1 py-2 text-xs font-black bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors uppercase"
                  >
                    Iniciar viaje
                  </button>
                )}
                {r.estado === 'EN_VIAJE' && (
                  <>
                    <button
                      onClick={() => updateEstado(r.id, 'ENTREGADO')}
                      className="flex-1 py-2 text-xs font-black bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors uppercase"
                    >
                      Entregado
                    </button>
                    <button
                      onClick={() => updateEstado(r.id, 'INCIDENCIA')}
                      className="px-4 py-2 text-xs font-black bg-white border border-red-200 text-red-500 rounded-xl hover:bg-red-50 transition-colors uppercase"
                    >
                      Incidencia
                    </button>
                  </>
                )}
                {r.estado === 'INCIDENCIA' && (
                  <button
                    onClick={() => updateEstado(r.id, 'EN_VIAJE')}
                    className="flex-1 py-2 text-xs font-black bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors uppercase"
                  >
                    Reintentar viaje
                  </button>
                )}
                {r.estado === 'ENTREGADO' && (
                  <div className="w-full text-center text-[10px] font-black text-emerald-500 uppercase py-2 bg-emerald-50 rounded-xl border border-emerald-100">
                    OPERACIÓN FINALIZADA
                  </div>
                )}
              </div>
            </div>
          )) : (
            <div className="col-span-full py-20 text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200">
                <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
              </div>
              <h4 className="text-slate-800 font-bold">No hay remitos que coincidan</h4>
              <p className="text-slate-400 text-sm">Cambia el filtro o genera un nuevo remito desde el formulario arriba.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
