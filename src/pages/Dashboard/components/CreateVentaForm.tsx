import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import useSWR from 'swr';
import apiClient from '../../../api/axiosConfig';
import { CreateClientForm } from './CreateClientForm';

export interface CreateVentaProps {
  onVentaCreated: () => void;
}

export interface VentaFormInputs {
  clienteId: number | null;
  observaciones?: string;
  metodoPago: 'MERCADO_PAGO' | 'EFECTIVO';
  montoAbonado?: number;
}

interface VentaItem {
  productoId: number;
  nombre: string;
  precio: number;
  cantidad: number;
  imageUrl?: string;
}

/**
 * Validación Declarativa (Yup) - Interfaz Venta Refactorizada
 */
const ventaSchema: yup.ObjectSchema<VentaFormInputs> = yup.object().shape({
  clienteId: yup
    .number()
    .nullable()
    .transform((value) => (isNaN(value) || value === 0 ? null : value))
    .default(null),
  observaciones: yup.string().optional(),
  metodoPago: yup.string().oneOf(['MERCADO_PAGO', 'EFECTIVO']).required().default('MERCADO_PAGO'),
  montoAbonado: yup.number().transform((value) => (isNaN(value) ? undefined : value)).optional(),
}) as yup.ObjectSchema<VentaFormInputs>;

const fetcher = (url: string) => apiClient.get(url).then((res) => res.data);

export const CreateVentaForm: React.FC<CreateVentaProps> = ({ onVentaCreated }) => {
  const [apiError, setApiError] = useState<string | null>(null);
  const [createdVentaId, setCreatedVentaId] = useState<number | string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  
  const [items, setItems] = useState<VentaItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | ''>('');

  const { data: clientes, isLoading: isLoadingClientes, mutate: mutateClientes } = useSWR('/clientes', fetcher);
  const { data: productos, isLoading: isLoadingProductos } = useSWR('/productos', fetcher);
  const { data: categorias } = useSWR('/categorias', fetcher);
  const { data: globalConfig } = useSWR('/config', fetcher);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<VentaFormInputs>({
    resolver: yupResolver(ventaSchema),
    defaultValues: { clienteId: null, metodoPago: 'MERCADO_PAGO', montoAbonado: 0 },
  });

  const [metodoPago, montoAbonado] = watch(['metodoPago', 'montoAbonado']);
  const esEfectivo = metodoPago === 'EFECTIVO';

  const itemsActuales = items || [];
  const subtotalNeto = itemsActuales.reduce((acc, item) => acc + (Number(item.precio || 0) * Number(item.cantidad || 0)), 0);
  const calculoIva = subtotalNeto * 0.21;
  const totalVenta = subtotalNeto + calculoIva;

  const pagado = Number(montoAbonado || 0);
  const vueltoDisplay = pagado > 0 ? Math.max(0, pagado - totalVenta).toFixed(2) : '0.00';
  
  // Lógica de filtrado de productos
  const filteredProducts = Array.isArray(productos) ? productos.filter((p: any) => {
    const matchesSearch = (p.nombre || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategoryId === '' || p.categoriaId === Number(selectedCategoryId);
    return matchesSearch && matchesCategory;
  }) : [];

  const handleAddItem = () => {
    if (!selectedProductId || !productos) return;
    const producto = productos.find((p: any) => p.id === Number(selectedProductId));
    if (!producto) return;

    setItems((prev) => {
      const existing = prev.find((i) => i.productoId === producto.id);
      if (existing) {
        return prev.map((i) =>
          i.productoId === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i
        );
      }
      return [
        ...prev,
        {
          productoId: producto.id,
          nombre: producto.nombre,
          precio: producto.precio || 0,
          cantidad: 1,
          imageUrl: producto.imageUrl,
        },
      ];
    });
  };

  const handleRemoveItem = (prodId: number) => {
    setItems((prev) => prev.filter((i) => i.productoId !== prodId));
  };

  const handleChangeQuantity = (prodId: number, qty: number) => {
    if (qty < 1) return;
    setItems((prev) =>
      prev.map((i) => (i.productoId === prodId ? { ...i, cantidad: qty } : i))
    );
  };

  const onSubmit: SubmitHandler<VentaFormInputs> = async (data) => {
    setApiError(null);

    if (items.length === 0) {
      setApiError('Debe agregar al menos un producto a la venta.');
      return;
    }

    try {
      const payload: any = {
        clienteId: data.clienteId,
        observaciones: data.observaciones,
        items: items.map((i) => ({ productoId: i.productoId, cantidad: i.cantidad })),
        metodoPago: data.metodoPago,
      };

      if (data.metodoPago === 'EFECTIVO' && data.montoAbonado) {
        payload.montoAbonado = Number(data.montoAbonado);
      }

      const response = await apiClient.post('/ventas', payload);

      const newId = response.data?.nroComprobante || response.data?.id || response.data?.numero;
      if (newId) {
        setCreatedVentaId(newId);
      }

      reset();
      setItems([]);
      setSelectedProductId('');
      
      onVentaCreated();
    } catch (error: any) {
      console.error('DETALLE DEL ERROR AL REGISTRAR VENTA:', error);
      if (!error.response) {
        setApiError('No se pudo conectar con el servidor.');
        return;
      }
      setApiError(error.response?.data?.message || 'Error desconocido al registrar la venta.');
    }
  };

  const handleGeneratePaymentLink = async () => {
    if (!createdVentaId) return;
    setIsGeneratingLink(true);
    setApiError(null);
    try {
      const response = await apiClient.post(`/pagos/link/${createdVentaId}`);
      if (response.data?.url) {
        window.open(response.data.url, '_blank');
      } else {
        setApiError('El servidor de pagos no devolvió una URL válida.');
      }
    } catch (error: any) {
      console.error('Error generando link de pago:', error);
      setApiError(error.response?.data?.message || 'Error al conectar con Mercado Pago.');
    } finally {
      setIsGeneratingLink(false);
    }
  };



  if (createdVentaId) {
    return (
      <>
        <div className="w-full p-12 mb-8 bg-white border border-slate-200 rounded-2xl shadow-sm text-center animate-in zoom-in-95 duration-500">
           <div className="w-20 h-20 mx-auto bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
             <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
           </div>
           <h2 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">¡Venta Registrada con Éxito!</h2>
           <p className="text-slate-500 mb-8 font-medium text-lg">El comprobante <span className="text-indigo-600 font-bold">#{createdVentaId}</span> ha sido guardado.</p>
           
           <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
             <button
               onClick={handleGeneratePaymentLink}
               disabled={isGeneratingLink}
               className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 font-bold text-white transition-all bg-[#009EE3] rounded-xl hover:bg-[#008ACA] shadow-lg disabled:opacity-50"
             >
               {isGeneratingLink ? 'Conectando...' : 'Generar Link de Mercado Pago'}
             </button>
  
             <button 
               onClick={() => { setCreatedVentaId(null); setApiError(null); }}
               className="w-full sm:w-auto px-8 py-4 font-bold text-slate-600 transition-all bg-slate-50 rounded-xl hover:bg-slate-100 border border-slate-200 shadow-sm"
             >
               Registrar Otra Venta
             </button>
           </div>
        </div>
      </>
    );
  }


  return (
    <>
      <div className="w-full relative block overflow-hidden bg-white border border-slate-100 rounded-2xl shadow-sm mb-8 p-4 sm:p-8 min-h-0">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
        <h2 className="text-2xl font-bold text-slate-800">Nueva Orden de Venta</h2>
        <div className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider rounded-full border border-indigo-100">
          SaaS Professional POS
        </div>
      </div>

      {apiError && (
        <div className="p-4 mb-6 text-sm text-red-700 bg-red-50 border-l-4 border-red-500 rounded shadow-sm">
          {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        
        {/* 1. Encabezado (Cliente) */}
        <div className="grid grid-cols-1 gap-6 p-6 bg-slate-50/50 rounded-xl border border-slate-100">
          <div className="flex flex-col gap-2">
            <label className="block text-sm font-semibold text-slate-700">Cliente (Consumidor Final por defecto)</label>
            <div className="flex gap-2">
              <select
                {...register('clienteId')}
                className={`flex-1 px-4 py-2.5 text-slate-700 bg-white border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                  errors.clienteId ? 'border-red-400 focus:ring-red-400' : 'border-slate-200 focus:ring-indigo-500 hover:border-indigo-300'
                }`}
                disabled={isSubmitting || isLoadingClientes}
              >
                <option value="0">Consumidor Final</option>
                {Array.isArray(clientes) && clientes.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} {c.apellido} {c.empresa ? `(${c.empresa})` : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setIsClientModalOpen(true)}
                className="px-4 py-2.5 bg-white border border-slate-200 text-indigo-600 rounded-lg hover:bg-indigo-50 hover:border-indigo-200 transition-all shadow-sm font-bold flex items-center justify-center gap-1"
                title="Crear Cliente Rápido"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
                <span>Nuevo</span>
              </button>
            </div>
            {errors.clienteId && <p className="mt-1 text-xs font-medium text-red-500">{errors.clienteId.message}</p>}
          </div>
        </div>

        {/* 2. El Carrito (Productos) */}
        <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm">
          <label className="block mb-3 text-sm font-bold text-slate-800 uppercase tracking-wide">Productos / Servicios</label>
          
          <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
            {/* Buscador por Nombre */}
            <div className="flex-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Buscar por Nombre</label>
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ej. Tornillo, Servicio..."
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
              />
            </div>

            {/* Selector por Categoría */}
            <div className="flex-1">
               <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Filtrar Categoría</label>
               <select 
                 value={selectedCategoryId} 
                 onChange={(e) => setSelectedCategoryId(e.target.value ? Number(e.target.value) : '')}
                 className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
               >
                 <option value="">Todas las categorías</option>
                 {Array.isArray(categorias) && categorias.map((c: any) => (
                   <option key={c.id} value={c.id}>{c.nombre}</option>
                 ))}
               </select>
            </div>

            {/* Selector de Producto Final */}
            <div className="flex-[2]">
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Seleccionar Resultado</label>
              <div className="flex gap-2">
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value ? Number(e.target.value) : '')}
                  className="flex-grow px-4 py-2.5 text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors text-sm font-bold"
                  disabled={isLoadingProductos || isSubmitting}
                >
                  <option value="">
                    {isLoadingProductos ? 'Cargando...' : `Seleccione (${filteredProducts.length} encontrados)`}
                  </option>
                  {filteredProducts.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} - ${p.precio}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddItem}
                  disabled={!selectedProductId || isSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 font-bold text-white transition-all bg-slate-800 rounded-lg whitespace-nowrap hover:bg-slate-900 disabled:opacity-50 shadow-sm text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
                  Agregar
                </button>
              </div>
            </div>
          </div>

          {items.length > 0 ? (
            <div className="overflow-hidden border border-slate-200 rounded-xl">
              <table className="min-w-full text-sm text-left text-slate-600">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th scope="col" className="px-6 py-4 font-bold">Concepto</th>
                    <th scope="col" className="px-6 py-4 font-bold text-right">Unitario</th>
                    <th scope="col" className="px-6 py-4 font-bold text-center">Cant.</th>
                    <th scope="col" className="px-6 py-4 font-bold text-right">Subtotal</th>
                    <th scope="col" className="px-6 py-4 font-bold text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(items || []).map((item) => (
                    <tr key={item.productoId} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 font-semibold text-slate-800">{item?.nombre || 'Producto Mapeado'}</td>
                      <td className="px-6 py-3 text-right">${Number(item.precio || 0).toFixed(2)}</td>
                      <td className="px-6 py-3 text-center">
                        <input
                          type="number"
                          min="1"
                          value={item.cantidad}
                          onChange={(e) => handleChangeQuantity(item.productoId, Number(e.target.value))}
                          className="w-16 px-2 py-1 text-center border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500"
                          disabled={isSubmitting}
                        />
                      </td>
                      <td className="px-6 py-3 text-right font-bold text-slate-800">
                        ${(Number(item.precio || 0) * Number(item.cantidad || 0)).toFixed(2)}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.productoId)}
                          className="text-slate-400 hover:text-red-500 transition-colors"
                          disabled={isSubmitting}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-100 rounded-xl text-slate-400 italic">
               No hay ítems cargados en la orden.
             </div>
          )}
        </div>

        {/* 3. Resumen y Observaciones */}
        <div className="p-6 bg-slate-50/30 rounded-xl border border-dashed border-slate-200">
          <label className="block mb-2 text-sm font-semibold text-slate-700">Observaciones Internas</label>
          <textarea
            {...register('observaciones')}
            rows={2}
            className="w-full p-4 text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
            placeholder="Notas para control de stock o logística..."
            disabled={isSubmitting}
          />
        </div>

        {/* 4. Sección de Pago y Totales (El Cierre) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-slate-100">
          
          {/* Lado Izquierdo: Pago */}
          <div className="space-y-6">
            <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm">
              <label className="block text-sm font-bold text-slate-800 uppercase tracking-wide mb-4">Método de Pago</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className={`flex items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all ${!esEfectivo ? 'border-blue-500 bg-blue-50/50 text-blue-700 shadow-sm' : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50 text-slate-600'}`}>
                  <input type="radio" value="MERCADO_PAGO" {...register('metodoPago')} className="sr-only" disabled={isSubmitting} />
                  <div className="flex items-center gap-2 font-bold text-sm">
                    🔗 Mercado Pago (Link)
                  </div>
                </label>

                <label className={`flex items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all ${esEfectivo ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700 shadow-sm' : 'border-slate-200 bg-white hover:border-emerald-200 hover:bg-slate-50 text-slate-600'}`}>
                  <input type="radio" value="EFECTIVO" {...register('metodoPago')} className="sr-only" disabled={isSubmitting} />
                  <div className="flex items-center gap-2 font-bold text-sm">
                    💵 Efectivo (En el local)
                  </div>
                </label>
              </div>
            </div>

            {esEfectivo && (
              <div className="mt-4 p-6 bg-emerald-50 border border-emerald-100/50 rounded-xl relative block w-full">
                <div className="space-y-4">
                  <div>
                    <label className="block text-emerald-900 font-bold mb-2">Paga con: $</label>
                    <div className="relative">
                      <span className="absolute left-4 top-3.5 font-bold text-emerald-600">$</span>
                      <input
                        type="number"
                        step="0.01"
                        {...register('montoAbonado')}
                        className="w-full pl-8 pr-4 py-3.5 bg-white border-2 border-emerald-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 text-lg font-black text-slate-800 transition-all shadow-sm"
                        placeholder="0.00"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-emerald-200/50">
                    <div className="text-xs font-bold text-emerald-800 uppercase tracking-widest mb-1">Vuelto a entregar</div>
                    {totalVenta > 0 && pagado > 0 ? (
                      pagado >= totalVenta ? (
                        <div className="text-3xl font-black text-emerald-600 tracking-tight flex items-baseline gap-1">
                          <span className="text-xl">$</span>{vueltoDisplay}
                        </div>
                      ) : (
                        <div className="text-red-500 font-bold flex items-center gap-2 mt-2 bg-red-50 p-3 rounded-lg border border-red-100 text-sm">
                          ❌ Falta dinero: ${(totalVenta - pagado).toFixed(2)}
                        </div>
                      )
                    ) : (
                      <div className="text-emerald-700/50 text-sm font-medium italic">Esperando monto abonado...</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Lado Derecho: Totales y Cierre */}
          <div className="space-y-6">
            <div className="p-6 bg-slate-900 rounded-2xl shadow-xl border border-slate-800 text-white">
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm text-slate-400">
                  <span>Neto Gravado:</span>
                  <span className="text-white">${subtotalNeto.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-400 border-b border-slate-700 pb-3">
                  <span>IVA (21%):</span>
                  <span className="text-white">${calculoIva.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Operación</span>
                <span className="text-4xl font-black text-white tracking-tight">
                  <span className="text-xl mr-1 text-slate-500">$</span>
                  {totalVenta.toFixed(2)}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || items.length === 0}
              className="w-full py-5 text-xl font-bold text-white transition-all bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:shadow-none"
            >
              {isSubmitting ? 'Procesando...' : 'Confirmar Venta'}
            </button>
          </div>

        </div>
      </form>

      {/* MODAL: CREAR CLIENTE RÁPIDO */}
      {isClientModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 relative animate-in zoom-in-95 duration-300">
             <button 
               onClick={() => setIsClientModalOpen(false)}
               className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"
             >
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
             </button>
             <CreateClientForm onClientCreated={() => { mutateClientes(); setIsClientModalOpen(false); }} />
           </div>
        </div>
      )}
      </div>
    </>
  );
};
