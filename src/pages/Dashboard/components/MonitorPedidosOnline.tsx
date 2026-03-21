import React, { useState } from 'react';
import useSWR from 'swr';
import { CheckCircle2, Phone, DollarSign, MessageCircle, Clock } from 'lucide-react';
import apiClient from '../../../api/axiosConfig';

/**
 * Componente: MonitorPedidosOnline
 * 
 * Monitorea las ventas y filtra aquellas originadas automáticamente por WhatsApp.
 * Polling cada 30 segundos utilizando SWR según requerimiento.
 */

interface Venta {
  id: number;
  nroComprobante?: string;
  cliente?: {
    nombre: string;
    apellido: string;
    telefono?: string;
  };
  totalFinal: number;
  observaciones?: string;
  estado?: string;
  fecha?: string;
}

const fetcher = (url: string) => apiClient.get(url).then((res) => res.data);

export const MonitorPedidosOnline: React.FC = () => {
  // Polling configurado a 30 segundos
  const { data: ventas, error, mutate, isLoading } = useSWR('/ventas', fetcher, {
    refreshInterval: 30000,
  });

  // Estado visual local para cambios instantáneos
  const [despachadosLocal, setDespachadosLocal] = useState<number[]>([]);

  /**
   * Extrae el teléfono de observaciones si no está en el cliente.
   * Supone formato: "Teléfono: 1234567890" o directo en observaciones
   */
  const getTelefono = (venta: Venta): string => {
    if (venta.cliente?.telefono) return venta.cliente.telefono;
    const match = venta.observaciones?.match(/Teléfono:\s*([+\d\-\s]+)/i);
    return match ? match[1].trim() : 'No especificado';
  };

  const handleConfirmarDespacho = async (ventaId: number) => {
    try {
      // Intento de actualización de estado; si el endpoint no existe, se gestiona localmente
      await apiClient.put(`/ventas/${ventaId}`, { estado: 'DESPACHADO' });
    } catch (apiError) {
      console.warn('Endpoint PUT /ventas/:id no disponible para despacho. Aplicando cambio visual local.', apiError);
    } finally {
      setDespachadosLocal((prev) => [...prev, ventaId]);
      mutate(); // Forzar revalidación optimista
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 bg-white rounded-2xl border border-slate-100 shadow-sm animate-pulse">
        <Clock className="w-5 h-5 animate-spin text-emerald-500 mr-2" />
        <span className="text-slate-500 font-bold text-sm">Sincronizando monitor online...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium">
        Error al cargar monitor de pedidos.
      </div>
    );
  }

  // Filtrar ventas por observaciones de WhatsApp
  const pedidosWhatsApp = Array.isArray(ventas)
    ? ventas.filter((v: Venta) => v.observaciones?.includes('Pedido automático vía WhatsApp'))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-emerald-500 fill-emerald-50" />
            Ventas Online (WhatsApp)
          </h2>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">Automatización de pedidos sincronizado en tiempo real.</p>
        </div>
        <span className="text-xs font-bold bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full border border-emerald-100 shadow-sm flex items-center gap-1.5 animate-pulse">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
          {pedidosWhatsApp.length} Activos
        </span>
      </div>

      {pedidosWhatsApp.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white border border-dashed border-slate-200 rounded-2xl text-slate-400">
          <MessageCircle className="w-12 h-12 text-slate-200 mb-3" />
          <p className="italic font-medium text-sm">No hay pedidos registrados vía WhatsApp.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {pedidosWhatsApp.map((v: Venta) => {
            const estaDespachado = despachadosLocal.includes(v.id) || v.estado === 'DESPACHADO' || v.estado === 'COMPLETADA';
            const telefonoString = getTelefono(v);
            const clientName = v.cliente ? `${v.cliente.nombre} ${v.cliente.apellido}` : 'S/N';

            return (
              <div
                key={v.id}
                className={`relative overflow-hidden bg-white border border-slate-200 rounded-xl shadow-sm transition-all duration-300 hover:shadow-md border-l-4 ${estaDespachado ? 'border-l-slate-400 opacity-75' : 'border-l-emerald-500'
                  }`}
              >
                {estaDespachado && (
                  <div className="absolute top-3 right-3 bg-slate-100 text-slate-600 font-bold text-[10px] uppercase items-center gap-1 tracking-widest px-2.5 py-1 rounded-full border border-slate-200 flex">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Despachado
                  </div>
                )}

                <div className="p-5">
                  <div className="mb-3">
                    <span className="font-mono text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
                      #{v.nroComprobante || v.id}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-800 truncate mb-1">{clientName}</h3>

                  <div className="space-y-2 mt-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span className="font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                        {telefonoString}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-600 border-t border-slate-100 pt-3 mt-3">
                      <DollarSign className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-500 font-bold text-xs">Total:</span>
                      <span className="text-lg font-black text-slate-900 ml-auto">
                        ${(v.totalFinal || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4 mt-4">
                    <button
                      onClick={() => handleConfirmarDespacho(v.id)}
                      disabled={estaDespachado}
                      className={`w-full py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm ${estaDespachado
                          ? 'bg-slate-50 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-emerald-500/20 shadow-lg shadow-emerald-500/10'
                        }`}
                    >
                      {estaDespachado ? 'Orden Despachada' : 'Confirmar Despacho'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
