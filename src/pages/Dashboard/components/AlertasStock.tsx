import React from 'react';
import useSWR from 'swr';
import apiClient from '../../../api/axiosConfig';

const fetcher = (url: string) => apiClient.get(url).then((res) => res.data);

interface ProductoAlerta {
  id: number;
  nombre: string;
  cantidadStock: number;
  stockMinimo: number;
  categoria?: { nombre: string };
}

export const AlertasStock: React.FC = () => {
  const { data: alertas, isLoading } = useSWR<ProductoAlerta[]>('/alertas/stock-minimo', fetcher, {
    refreshInterval: 60000, // Revalida cada 60 segundos automáticamente
  });

  const count = Array.isArray(alertas) ? alertas.length : 0;

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse">
        <div className="h-6 w-32 bg-slate-100 rounded mb-4"></div>
        <div className="space-y-3">
          <div className="h-20 bg-slate-50 rounded-xl"></div>
          <div className="h-20 bg-slate-50 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      {/* Header del Widget */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-lg ${count > 0 ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-400'}`}>
            <svg className="w-5 h-5 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <h3 className="font-black text-slate-800 tracking-tight uppercase text-sm">Alertas de Stock</h3>
        </div>

        {count > 0 && (
          <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-bounce shadow-sm">
            {count} CRÍTICAS
          </span>
        )}
      </div>

      {/* Contenido / Lista */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[400px]">
        {count === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center border border-emerald-100 shadow-inner">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-black text-slate-700">Inventario Saludable</p>
              <p className="text-xs font-semibold text-slate-400">Todos los productos tienen stock suficiente.</p>
            </div>
          </div>
        ) : (
          alertas?.map((producto) => (
            <div
              key={producto.id}
              className="bg-slate-50/50 border border-slate-200 border-l-4 border-l-red-500 rounded-xl p-4 flex items-center justify-between transition-all hover:bg-slate-50 hover:shadow-sm"
            >
              <div className="space-y-1">
                <p className="text-xs font-black text-slate-800 uppercase tracking-tight truncate max-w-[140px] md:max-w-none">
                  {producto.nombre}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold bg-white text-slate-400 border border-slate-100 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                    {producto.categoria?.nombre || 'General'}
                  </span>
                  <p className="text-[10px] font-bold text-slate-400">Min: {producto.stockMinimo}</p>
                </div>
              </div>

              <div className="text-right">
                <span className={`text-xl font-black ${producto.cantidadStock === 0 ? 'text-red-500' : 'text-amber-500'}`}>
                  {producto.cantidadStock}
                </span>
                <p className="text-[10px] font-black text-slate-400 uppercase leading-none">Stock</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
